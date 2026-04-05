import { NextResponse } from 'next/server';
import { contentIngestionService } from '@/content-ingestion/content-ingestion.service';
import { postRepository } from '@/lib/postRepository';
import { createClient } from '@/lib/supabase/server';
import { getCountryFromRequest } from '@/lib/geo';

export const runtime = 'nodejs';

// Deterministic fake author from a post ID so every ingested post
// always shows the same realistic name (no DB changes needed).
function fakeAuthorFromId(id: string) {
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const firstNames = ['Alex', 'Jamie', 'Morgan', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Devon', 'Avery', 'Quinn', 'Sam', 'Blake', 'Drew', 'Reese', 'Skyler', 'Logan', 'Cameron', 'Peyton', 'Charlie', 'Finley', 'Harper', 'Ellis', 'Sage', 'River', 'Rowan'];
    const lastNames = ['Chen', 'Patel', 'Kim', 'Rodriguez', 'Williams', 'Johnson', 'Thompson', 'Anderson', 'Martinez', 'Garcia', 'Singh', 'Lee', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Jackson', 'White', 'Harris', 'Nguyen', 'Walker', 'Hall', 'Allen', 'Young'];
    const first = firstNames[hash % firstNames.length];
    const last = lastNames[Math.floor(hash / firstNames.length) % lastNames.length];
    const display_name = `${first} ${last}`;
    const username = `${first.toLowerCase()}${last.toLowerCase()}`;
    return {
        id: `fake-${id.slice(0, 8)}`,
        email: '',
        username,
        display_name,
        bio: '',
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(display_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        location: '',
        role: 'USER' as const,
        is_verified: false,
        is_suspended: false,
        is_business: false,
        created_at: new Date().toISOString(),
        follower_count: 0,
        following_count: 0,
        total_likes: 0,
        post_count: 0,
    };
}

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

    // Fetch cached posts (content ingestion)
    const cachedPosts = await postRepository.getAll();
    
    // Fetch real user posts from Supabase
    let realUserPosts: any[] = [];
    try {
        const { createAnonClient } = await import('@/lib/supabase/anon');
        const supabase = createAnonClient();
        if (supabase) {
            const { data: dbPosts, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    author:users(id, username, display_name, bio, avatar_url, role, is_verified, is_business, created_at, follower_count, following_count)
                `)
                .eq('status', 'PUBLISHED')
                .order('published_at', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error('[feed] Supabase fetch error:', error);
            } else if (dbPosts) {
                // Transform DB posts to match Post type
                realUserPosts = dbPosts.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    subtitle: p.subtitle || '',
                    content: typeof p.content === 'string' ? p.content : p.content?.html || '',
                    cover_image_url: p.cover_image_url,
                    cover_aspect_ratio: p.cover_aspect_ratio || '16:9',
                    author_id: p.author_id,
                    author: p.author ? {
                        id: p.author.id,
                        email: p.author.email || '',
                        username: p.author.username || 'unknown',
                        display_name: p.author.display_name || p.author.username || 'Unknown User',
                        bio: p.author.bio || '',
                        avatar_url: p.author.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.author.username || 'user'}`,
                        location: p.author.location || '',
                        role: p.author.role || 'USER',
                        is_verified: p.author.is_verified || false,
                        is_suspended: p.author.is_suspended || false,
                        is_business: p.author.is_business || false,
                        created_at: p.author.created_at,
                        follower_count: p.author.follower_count || 0,
                        following_count: p.author.following_count || 0,
                        total_likes: p.author.total_likes || 0,
                        post_count: p.author.post_count || 0,
                    } : fakeAuthorFromId(p.id),
                    status: p.status,
                    read_time_minutes: p.read_time_minutes || 1,
                    engagement_score: p.engagement_score || 0,
                    like_count: p.like_count || 0,
                    comment_count: p.comment_count || 0,
                    share_count: p.share_count || 0,
                    is_trending: p.is_trending || false,
                    source: p.source_platform || 'purseable',
                    source_url: p.source_url,
                    country_code: p.country_code || null,
                    created_at: p.created_at,
                    published_at: p.published_at,
                    tags: [],
                }));
                console.log('[feed] Fetched', realUserPosts.length, 'real user posts from Supabase');
            }
        }
    } catch (err) {
        console.error('[feed] Failed to fetch real user posts:', err);
    }
    
    // Merge cached and real user posts, removing duplicates by ID
    const postMap = new Map();
    [...realUserPosts, ...cachedPosts].forEach(p => {
        if (!postMap.has(p.id)) {
            postMap.set(p.id, p);
        }
    });
    const allPosts = Array.from(postMap.values());
    console.log('[feed] Total merged posts:', allPosts.length);

    const validPosts = allPosts.filter(p => {
        if (p.status !== 'PUBLISHED') return false;
        if (p.source === 'guardian') return false; // Guardian posts removed
        if (p.source === 'wikinews') return false; // Wikinews posts removed
        if (p.id.includes('/')) return false;
        if (!p.content || p.content.trim().length === 0) return false;
        // Exclude old cached post IDs that don't exist in Supabase
        if (p.id.startsWith('hashnode-') || p.id.startsWith('devto-') || p.id.startsWith('wikinews-') || 
            p.id.startsWith('guardian-') || /^p\d+$/.test(p.id) || p.id.startsWith('user-')) return false;
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
