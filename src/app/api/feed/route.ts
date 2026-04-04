import { NextResponse } from 'next/server';
import { contentIngestionService } from '@/content-ingestion/content-ingestion.service';
import { postRepository } from '@/lib/postRepository';
import { createClient } from '@/lib/supabase/server';
import { getCountryFromRequest } from '@/lib/geo';

export const runtime = 'nodejs';

let hasAutoIngested = false;

// Ad slot positions (1 ad per 4 organic pins)
const AD_SLOT_POSITIONS = [1, 5, 10, 15];

// Max 1 ad per 15 pins from same advertiser
const ADVERTISER_FREQUENCY_CAP = 15;

// Lazy load admin client only when needed
async function getSupabaseAdmin() {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    return supabaseAdmin;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 30;
    const feedSessionId = searchParams.get('session') || crypto.randomUUID();

    // Auto-ingest on first request (don't block response)
    // Skip on Netlify - posts already in Supabase with UUID IDs
    // Ingestion creates hashnode-xxx IDs that don't match DB UUIDs
    if (!hasAutoIngested && process.env.NETLIFY !== 'true') {
        hasAutoIngested = true;
        contentIngestionService.ingestAll().catch(err => {
            console.error('Initial auto-ingestion failed', err);
        });
    }

    const start = (page - 1) * perPage;
    const end = start + perPage;

    // Detect viewer's country for geoblocking
    const viewerCountry = await getCountryFromRequest();
    console.log('[feed] Viewer country:', viewerCountry);

    const allPosts = await postRepository.getAll();

    const validPosts = allPosts.filter(p => {
        if (p.status !== 'PUBLISHED') return false;
        if (p.source === 'guardian') return false;
        if (p.id.includes('/')) return false;
        if (!p.content || p.content.trim().length === 0) return false;
        // Geoblocking: only show posts from viewer's country or global posts (no country set)
        if (p.country_code && viewerCountry && p.country_code !== viewerCountry) return false;
        return true;
    });

    let pagedPosts = validPosts.slice(start, end);

    if (pagedPosts.length === 0 && validPosts.length > 0) {
        pagedPosts = validPosts.slice(0, perPage).map(p => ({ ...p, id: p.id + '-cycle-' + page }));
    }

    // Run ad auction and inject winning ads
    let feedItems: any[] = [...pagedPosts];
    
    // Only try ad auction if we have admin credentials
    let hasAdminCredentials = false;
    try {
        const adminClient = await getSupabaseAdmin();
        // Test if admin client works
        hasAdminCredentials = !!adminClient;
    } catch {
        // No admin credentials available
        hasAdminCredentials = false;
    }
    
    if (hasAdminCredentials) {
        try {
            const supabaseAdmin = await getSupabaseAdmin();
            // Get current user for personalized auction
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            // Calculate available slots based on organic content
            const availableSlots = Math.min(
                AD_SLOT_POSITIONS.length,
                Math.floor(pagedPosts.length / 4)
            );

            if (availableSlots > 0) {
                // Run the auction
                const { data: auctionResults, error: auctionError } = await supabaseAdmin.rpc('run_ad_auction', {
                    p_user_id: user?.id || null,
                    p_available_slots: availableSlots,
                    p_feed_session_id: feedSessionId,
                    p_viewer_country: viewerCountry
                });

                if (!auctionError && auctionResults && auctionResults.length > 0) {
                    // Track advertiser frequency for this feed session
                    const advertiserFrequency: Record<string, number[]> = {};
                    
                    // Get full ad details for winners
                    const winningAdIds = auctionResults.map((r: any) => r.ad_id);
                    
                    const { data: adsData } = await supabaseAdmin
                        .from('ads')
                        .select('id, title, description, target_url, image_url, image_urls, status, user_id, max_cpc, quality_score, ad_rank, actual_cpc_charged, category')
                        .in('id', winningAdIds)
                        .eq('status', 'APPROVED');

                    const adsById = (adsData || []).reduce((acc, ad) => {
                        acc[ad.id] = ad;
                        return acc;
                    }, {} as Record<string, any>);

                    // Inject ads at their winning positions
                    for (const result of auctionResults) {
                        const ad = adsById[result.ad_id];
                        if (!ad) continue;

                        // Frequency cap check: same advertiser max once per 15 positions
                        const advertiserSlots = advertiserFrequency[ad.user_id] || [];
                        const lastSlot = advertiserSlots.length > 0 ? Math.max(...advertiserSlots) : -ADVERTISER_FREQUENCY_CAP;
                        
                        if (result.position - lastSlot < ADVERTISER_FREQUENCY_CAP) {
                            continue; // Skip this ad due to frequency cap
                        }

                        // Record the win and charge
                        await supabaseAdmin.rpc('record_auction_win', {
                            p_ad_id: result.ad_id,
                            p_user_id: user?.id || null,
                            p_position: result.position,
                            p_ad_rank: result.ad_rank,
                            p_actual_cpc: result.actual_cpc,
                            p_effective_bid: result.effective_bid,
                            p_quality_score: result.quality_score,
                            p_feed_session_id: feedSessionId
                        });

                        // Track advertiser slot
                        advertiserFrequency[ad.user_id] = [...advertiserSlots, result.position];

                        // Inject ad into feed at correct position
                        // Position is 1-indexed, convert to 0-indexed array position
                        const arrayPosition = result.position - 1;
                        
                        if (arrayPosition <= feedItems.length) {
                            feedItems.splice(arrayPosition, 0, {
                                ...ad,
                                is_ad: true,
                                ad_position: result.position,
                                ad_rank: result.ad_rank,
                                quality_score: result.quality_score,
                                effective_bid: result.effective_bid,
                                actual_cpc: result.actual_cpc,
                                _isSponsored: true  // Flag for frontend
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[feed] auction injection failed:', err);
            // Continue with organic posts only if auction fails
        }
    }

    return NextResponse.json({
        posts: feedItems,
        hasMore: true,
        feed_session_id: feedSessionId,
        ad_count: feedItems.filter((i: any) => i.is_ad).length
    });
}
