'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Flame, Megaphone } from 'lucide-react';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './PostCardSkeleton';
import { MOCK_INTERESTS } from '@/lib/mockData';
import type { Post } from '@/types';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cardImageUrl } from '@/lib/cloudinary';

const INTERESTS_STRIP = MOCK_INTERESTS.slice(0, 12);

type FeedAd = {
    id: string;
    title: string;
    description?: string | null;
    image_url: string;
    image_urls?: string[] | null;
    target_url: string;
};

// ─── Stable column buckets ────────────────────────────────────────────────────
// We render N separate column divs and assign each post to a column by its
// index modulo N. This means new posts only append to the bottom of their
// target column — existing cards NEVER move/reflow when more posts load.
function useColumnCount(): number {
    const [cols, setCols] = useState(4);
    useEffect(() => {
        function update() {
            const w = window.innerWidth;
            if (w < 640) setCols(3);
            else if (w < 1024) setCols(3);
            else if (w < 1440) setCols(4);
            else setCols(5);
        }
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return cols;
}

function isFeedAd(item: Post | FeedAd): item is FeedAd {
    return 'target_url' in item;
}

function MasonryAdCard({ ad, index }: { ad: FeedAd, index: number }) {
    const images = ad.image_urls && ad.image_urls.length > 0 ? ad.image_urls : [ad.image_url];
    const [currentImg, setCurrentImg] = useState(0);

    const handleAdClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        event.stopPropagation();

        try {
            await fetch('/api/ads/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adId: ad.id,
                    location: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    deviceType: /Mobi|Android/i.test(window.navigator.userAgent) ? 'Mobile' : 'Desktop',
                    osFamily: window.navigator.platform || 'Unknown',
                }),
                keepalive: true,
            });
        } catch (err) {
            console.error('[ads] click tracking failed', err);
        }

        window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    };

    useEffect(() => {
        if (images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentImg(curr => (curr + 1) % images.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [images.length]);

    const dynamicPaddingBottom = '150%';

    return (
        <div className="masonry-item fade-up" style={{ animationDelay: `${index * 60}ms` }}>
            <article className="post-card" style={{ border: '2px solid var(--color-accent)', background: 'var(--color-surface)', position: 'relative' }}>
                <a href={ad.target_url} target="_blank" rel="noopener noreferrer" onClick={handleAdClick} style={{ position: 'absolute', inset: 0, zIndex: 10 }} aria-label={`View ${ad.title}`} />
                <div style={{ position: 'relative', paddingBottom: dynamicPaddingBottom, height: 0, overflow: 'hidden' }}>
                    <div className="trending-badge" style={{ background: 'var(--color-primary)', color: 'var(--color-surface)', top: 12, left: 12, right: 'auto', bottom: 'auto', zIndex: 20 }}>
                        <Megaphone size={10} /> Sponsored
                    </div>
                    {images.map((src: string, i: number) => {
                        const isVideo = src.match(/\.(mp4|webm|mov|ogg)$/i) || src.includes('/video/upload/');
                        const style = {
                            position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' as const,
                            opacity: currentImg === i ? 1 : 0, transition: 'opacity 0.6s ease-in-out'
                        };
                        return isVideo ? (
                            <video key={i} src={src} style={style} muted autoPlay loop playsInline />
                        ) : (
                            <img key={i} src={cardImageUrl(src)} alt={ad.title} className="post-card-image" loading="lazy" style={style} />
                        )
                    })}
                    <div className="mobile-overlay-banner" style={{ zIndex: 20 }}>
                        <h2 className="mobile-overlay-title">{ad.title}</h2>
                        <div className="mobile-overlay-author">
                            <span>Sponsored</span>
                        </div>
                    </div>
                </div>
                <div className="post-card-body" style={{ padding: '16px', zIndex: 20, position: 'relative' }}>
                    <h2 className="post-card-title">{ad.title}</h2>
                    {ad.description && <p className="post-card-excerpt" style={{ marginTop: '8px' }}>{ad.description}</p>}
                </div>
            </article>
        </div>
    );
}

function MasonryColumns({ items, currentUserId }: { items: Array<Post | FeedAd>; currentUserId?: string }) {
    const numCols = useColumnCount();

    // Build column arrays — each post goes to col = index % numCols
    const columns = useMemo(() => {
        const cols: Array<Array<Post | FeedAd>> = Array.from({ length: numCols }, () => []);
        items.forEach((item, i) => cols[i % numCols].push(item));
        return cols;
    }, [items, numCols]);

    return (
        <div className="masonry-columns-container">
            {columns.map((colItems, colIdx) => (
                <div key={colIdx} className="masonry-column">
                    {colItems.map((item, rowIdx) => {
                        const index = colIdx + rowIdx * numCols;
                        if (isFeedAd(item) && item.target_url) {
                            return <MasonryAdCard key={`ad-${item.id}`} ad={item} index={index} />;
                        }
                        return <PostCard
                            key={item.id}
                            post={item as Post}
                            index={index}
                            currentUserId={currentUserId}
                        />;
                    })}
                </div>
            ))}
        </div>
    );
}

// ─── Feed Inner ───────────────────────────────────────────────────────────────
const supabaseClientSingleton = (() => {
    let client: ReturnType<typeof createClient> | null = null;
    return () => {
        if (!client) client = createClient();
        return client;
    };
})();

function FeedInner({ isLoggedIn = false, externalPosts }: { isLoggedIn?: boolean; externalPosts?: Post[] }) {
    const searchParams = useSearchParams();
    const currentTopic = searchParams.get('topic') || 'Top News';

    const [posts, setPosts] = useState<Post[]>(externalPosts || []);
    const [loading, setLoading] = useState(!externalPosts);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [activeInterest, setActiveInterest] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [ads, setAds] = useState<FeedAd[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | undefined>();
    const loaderRef = useRef<HTMLDivElement>(null);
    const supabase = supabaseClientSingleton();

    // Get current user ID
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        getUser();
    }, [supabase]);

    type FeedResponse = {
        posts?: Post[];
        hasMore?: boolean;
    };

    // Initial load from Edge Function & fetch ads (only if no external posts provided)
    useEffect(() => {
        if (externalPosts) {
            setPosts(externalPosts);
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setPosts([]);
        fetch(`/api/feed?topic=${encodeURIComponent(currentTopic)}&page=1`)
            .then(res => res.json())
            .then(data => {
                setPosts(data.posts || []);
                setHasMore(data.hasMore);
                setPage(2);
                setLoading(false);
            })
            .catch(() => setLoading(false));

        supabase.from('ads')
            .select('*')
            .in('status', ['APPROVED', 'ACTIVE'])
            .limit(5)
            .then(({ data }: { data: FeedAd[] | null }) => {
                if (data) setAds(data);
            });
    }, [currentTopic, supabase, externalPosts]);

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        fetch(`/api/feed?topic=${encodeURIComponent(currentTopic)}&page=${page}`)
            .then(res => res.json())
            .then((data: FeedResponse) => {
                const incomingPosts = data.posts ?? [];
                if (incomingPosts.length > 0) {
                    setPosts(prev => {
                        const ids = new Set(prev.map(p => p.id));
                        const fresh = incomingPosts.filter((p: Post) => !ids.has(p.id));
                        return [...prev, ...fresh];
                    });
                    setPage(p => p + 1);
                } else {
                    setHasMore(false);
                }
                setLoadingMore(false);
            })
            .catch(() => setLoadingMore(false));
    }, [loadingMore, hasMore, currentTopic, page]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (!loaderRef.current || loading) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore();
                }
            },
            { rootMargin: '1500px' }
        );
        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [loading, hasMore, loadingMore, loadMore]);

    const displayPosts = activeInterest
        ? posts.filter(p => {
            const matchesTag = p.tags.some(t => t.name === activeInterest.toLowerCase());
            const matchesAuthorBio = p.author?.bio?.toLowerCase().includes(activeInterest.toLowerCase()) ?? false;
            return matchesTag || matchesAuthorBio;
        })
        : posts;

    const feedItems = useMemo(() => {
        const items: Array<Post | FeedAd> = [...displayPosts];
        if (ads.length > 0) {
            let adCounter = 0;
            // Inject an ad every 6 items (index 4, 11, etc.)
            for (let i = 4; i < items.length; i += 7) {
                if (adCounter < ads.length) {
                    items.splice(i, 0, ads[adCounter]);
                    adCounter++;
                } else {
                    break;
                }
            }
        }
        return items;
    }, [displayPosts, ads]);

    const trendingPosts = displayPosts.filter(p => p.is_trending).slice(0, 6);

    return (
        <>
            {/* Interests Strip (authenticated users) */}
            {isLoggedIn && (
                <div className="interests-strip">
                    <button
                        className={`interest-pill ${!activeInterest ? 'active' : ''}`}
                        onClick={() => setActiveInterest(null)}
                    >
                        ✨ For You
                    </button>
                    {INTERESTS_STRIP.map(interest => (
                        <button
                            key={interest.id}
                            className={`interest-pill ${activeInterest === interest.name ? 'active' : ''}`}
                            onClick={() => setActiveInterest(activeInterest === interest.name ? null : interest.name)}
                        >
                            {interest.icon} {interest.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Trending Strip (authenticated users) */}
            {isLoggedIn && !activeInterest && trendingPosts.length > 0 && (
                <div style={{ padding: '20px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <Flame size={18} style={{ color: 'var(--color-trending)' }} />
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '18px' }}>
                            Trending Today
                        </h2>
                    </div>
                    <div className="trending-strip">
                        {/* Render Trending Posts */}
                        {trendingPosts.map(post => (
                            <Link key={post.id} href={`/post/${post.id}`} style={{ textDecoration: 'none' }}>
                                <div className="trending-card">
                                    <div style={{ height: '110px', overflow: 'hidden' }}>
                                        <img src={cardImageUrl(post.cover_image_url)} alt={post.title}
                                            loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ padding: '10px 12px 12px' }}>
                                        <p style={{
                                            fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '13px',
                                            lineHeight: '1.3', color: 'var(--color-primary)',
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>
                                            {post.title}
                                        </p>
                                        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '5px' }}>
                                            {post.author?.display_name ?? 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Section Label */}
            <div style={{ padding: '24px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)' }}>
                    {activeInterest ? `#${activeInterest}` : isLoggedIn ? 'Your Feed' : 'Discover'}
                </h2>
                {displayPosts.length > 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                        {displayPosts.length} stories
                    </span>
                )}
            </div>

            {/* Masonry Grid — explicit column buckets so new cards never displace old ones */}
            {loading ? (
                <div className="masonry-grid" style={{ paddingTop: 0 }}>
                    {Array.from({ length: 8 }).map((_, i) => <PostCardSkeleton key={i} index={i} />)}
                </div>
            ) : (
                <MasonryColumns items={feedItems} currentUserId={currentUserId} />
            )}

            {/* Load More Skeletons — appended BELOW existing content, not replacing it */}
            {loadingMore && (
                <div style={{ display: 'flex', gap: '16px', padding: '16px 16px 0', alignItems: 'flex-start' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ flex: 1 }}>
                            <PostCardSkeleton index={i} />
                        </div>
                    ))}
                </div>
            )}

            {/* IntersectionObserver Sentinel */}
            {!loading && hasMore && (
                <div ref={loaderRef} style={{ height: '40px' }} />
            )}

            {/* End of feed */}
            {(!hasMore && !loading) && (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', fontSize: '14px' }}>
                    <p>✨ You&apos;ve seen all the stories for now. Refresh for more.</p>
                </div>
            )}
        </>
    );
}

export function MasonryFeed(props: { isLoggedIn?: boolean; posts?: Post[] }) {
    return (
        <Suspense fallback={
            <div className="masonry-grid" style={{ paddingTop: 0 }}>
                {Array.from({ length: 12 }).map((_, i) => <PostCardSkeleton key={i} index={i} />)}
            </div>
        }>
            <FeedInner {...props} externalPosts={props.posts} />
        </Suspense>
    );
}
