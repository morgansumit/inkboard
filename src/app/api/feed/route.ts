import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCountryFromRequest } from '@/lib/geo';

export const runtime = 'nodejs';

// Ad slot positions (1 ad per 4 organic pins)
const AD_SLOT_POSITIONS = [1, 5, 10, 15];

// Max 1 ad per 15 pins from same advertiser
const ADVERTISER_FREQUENCY_CAP = 15;

async function getSupabaseAdmin() {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    return supabaseAdmin;
}

function transformPost(p: any) {
    return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        content: typeof p.content === 'string' ? p.content : p.content?.html || '',
        cover_image_url: p.cover_image_url,
        cover_aspect_ratio: p.cover_aspect_ratio || '16:9',
        author_id: p.author_id,
        author: p.author ? {
            id: p.author.id,
            email: '',
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
        } : null,
        status: p.status,
        read_time_minutes: p.read_time_minutes || 1,
        engagement_score: p.engagement_score || 0,
        like_count: p.like_count || 0,
        comment_count: p.comment_count || 0,
        share_count: p.share_count || 0,
        is_trending: p.is_trending || false,
        source_url: p.source_url,
        country_code: p.country_code || null,
        created_at: p.created_at,
        published_at: p.published_at,
        tags: [],
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 30;
    const feedSessionId = searchParams.get('session') || crypto.randomUUID();

    const start = (page - 1) * perPage;

    // Detect viewer's country for geoblocking
    // First try to get from authenticated user's metadata, fallback to IP detection
    let viewerCountry: string | null = null;
    
    try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.user_metadata?.country_code) {
            viewerCountry = user.user_metadata.country_code;
            console.log('[feed] Using user country from metadata:', viewerCountry);
        } else {
            viewerCountry = await getCountryFromRequest();
            console.log('[feed] Using IP-detected country:', viewerCountry || 'null');
        }
    } catch (err) {
        // If auth fails, fallback to IP detection
        viewerCountry = await getCountryFromRequest();
        console.log('[feed] Auth failed, using IP-detected country:', viewerCountry || 'null');
    }

    console.log('[feed] Final viewer country:', viewerCountry || 'null (showing global posts only)');

    // Direct Supabase query — no cache
    const { createAnonClient } = await import('@/lib/supabase/anon');
    const supabase = createAnonClient();

    if (!supabase) {
        return NextResponse.json({ posts: [], hasMore: false });
    }

    let query = supabase
        .from('posts')
        .select(`
            *,
            author:users!posts_author_id_fkey(id, username, display_name, bio, avatar_url, location, role, is_verified, is_business, created_at, follower_count, following_count)
        `)
        .eq('status', 'PUBLISHED')
        .not('author_id', 'is', null)
        .order('published_at', { ascending: false })
        .range(start, start + perPage - 1);

    // Geoblocking filter
    if (viewerCountry) {
        // If viewer country detected: show global posts (null) + posts from viewer's country
        query = query.or(`country_code.is.null,country_code.eq.${viewerCountry}`);
    } else {
        // If viewer country not detected (localhost/dev): only show global posts
        query = query.is('country_code', null);
    }

    const { data: dbPosts, error } = await query;

    if (error) {
        console.error('[feed] Supabase error:', error);
        return NextResponse.json({ posts: [], hasMore: false });
    }

    const posts = (dbPosts || []).map(transformPost);

    // Run ad auction and inject winning ads
    let feedItems: any[] = [...posts];

    let hasAdminCredentials = false;
    try {
        const adminClient = await getSupabaseAdmin();
        hasAdminCredentials = !!adminClient;
    } catch {
        hasAdminCredentials = false;
    }

    if (hasAdminCredentials) {
        try {
            const supabaseAdmin = await getSupabaseAdmin();
            const serverClient = await createClient();
            const { data: { user } } = await serverClient.auth.getUser();

            const availableSlots = Math.min(
                AD_SLOT_POSITIONS.length,
                Math.floor(posts.length / 4)
            );

            if (availableSlots > 0) {
                const { data: auctionResults, error: auctionError } = await supabaseAdmin.rpc('run_ad_auction', {
                    p_user_id: user?.id || null,
                    p_available_slots: availableSlots,
                    p_feed_session_id: feedSessionId,
                    p_viewer_country: viewerCountry
                });

                if (!auctionError && auctionResults && auctionResults.length > 0) {
                    const advertiserFrequency: Record<string, number[]> = {};
                    const winningAdIds = auctionResults.map((r: any) => r.ad_id);

                    const { data: adsData } = await supabaseAdmin
                        .from('ads')
                        .select('id, title, description, target_url, image_url, image_urls, status, user_id, max_cpc, quality_score, ad_rank, actual_cpc_charged, category')
                        .in('id', winningAdIds)
                        .eq('status', 'APPROVED');

                    const adsById = (adsData || []).reduce((acc: Record<string, any>, ad: any) => {
                        acc[ad.id] = ad;
                        return acc;
                    }, {});

                    for (const result of auctionResults) {
                        const ad = adsById[result.ad_id];
                        if (!ad) continue;

                        const advertiserSlots = advertiserFrequency[ad.user_id] || [];
                        const lastSlot = advertiserSlots.length > 0 ? Math.max(...advertiserSlots) : -ADVERTISER_FREQUENCY_CAP;

                        if (result.position - lastSlot < ADVERTISER_FREQUENCY_CAP) continue;

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

                        advertiserFrequency[ad.user_id] = [...advertiserSlots, result.position];

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
                                _isSponsored: true
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[feed] auction injection failed:', err);
        }
    }

    return NextResponse.json({
        posts: feedItems,
        hasMore: posts.length === perPage,
        feed_session_id: feedSessionId,
        ad_count: feedItems.filter((i: any) => i.is_ad).length
    });
}
