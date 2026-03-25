'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Flame, Clock } from 'lucide-react';
import type { Post } from '@/types';
import { createClient } from '@/lib/supabase/client';

const LOCAL_ASPECT_RATIO_PADDING: Record<string, string> = {
    '3:4': '133.3%',
    '2:3': '150%',
    '9:16': '177.8%',
    '4:3': '75%',
    '16:9': '56.25%',
    '1:1': '100%',
};

function formatNumber(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return `${n}`;
}



const PINTEREST_ASPECT_RATIOS = ['133.3%', '150%', '125%', '177.8%', '100%', '75%', '166.6%'];

function getPseudoRandomRatio(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return PINTEREST_ASPECT_RATIOS[Math.abs(hash) % PINTEREST_ASPECT_RATIOS.length];
}

interface PostCardProps {
    post: Post;
    index?: number;
}

export function PostCard({ post, index = 0 }: PostCardProps) {
    const router = useRouter();
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [engagementLoaded, setEngagementLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Use a pseudo-random aspect ratio based on the post ID so they are staggered
    // like Pinterest, preventing symmetric 'rows' if images happen to be the same ratio.
    const dynamicPaddingBottom = getPseudoRandomRatio(post.id);

    // Check authentication status
    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            setIsAuthenticated(!!session);
        };
        checkAuth();
    }, []);

    // Fetch engagement data from Supabase on mount
    useEffect(() => {
        const fetchEngagement = async () => {
            try {
                const response = await fetch(`/api/posts/${post.id}/engagement`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.engagement) {
                        setLikeCount(data.engagement.like_count);
                        setCommentCount(data.engagement.comment_count);
                        setLiked(data.engagement.is_liked);
                        setEngagementLoaded(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch engagement data:', error);
            }
        };

        fetchEngagement();
    }, [post.id]);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if user is authenticated
        if (!isAuthenticated) {
            router.push('/register');
            return;
        }
        
        // Optimistic UI update
        const newLikedState = !liked;
        setLiked(newLikedState);
        setLikeCount(c => liked ? c - 1 : c + 1);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);
        
        // Persist to API
        try {
            const response = await fetch(`/api/posts/${post.id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                // Revert optimistic update if API call fails
                setLiked(!newLikedState);
                setLikeCount(c => newLikedState ? c - 1 : c + 1);
                console.error('Failed to toggle like');
            }
        } catch (error) {
            // Revert optimistic update if network error
            setLiked(!newLikedState);
            setLikeCount(c => newLikedState ? c - 1 : c + 1);
            console.error('Like API error:', error);
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({ title: post.title, url: `/post/${post.id}` });
        } else {
            navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        }
    };

    return (
        <div
            className="masonry-item fade-up"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <article className="post-card">
                <Link href={`/post/${post.id}`} style={{ position: 'absolute', inset: 0, zIndex: 10 }} aria-label={`View ${post.title}`} />
                {/* Cover Image */}
                <div style={{ position: 'relative', paddingBottom: dynamicPaddingBottom, height: 0, overflow: 'hidden' }}>
                    <img
                        src={post.cover_image_url || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80'}
                        alt={post.title}
                        className="post-card-image"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        loading={index < 4 ? 'eager' : 'lazy'}
                    />
                    {post.is_trending && (
                        <div className="trending-badge">
                            <Flame size={10} /> Trending
                        </div>
                    )}
                    {post.source && (
                        <Link
                            href={`/source/${post.source}`}
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'absolute', bottom: '12px', left: '12px',
                                background: 'rgba(0,0,0,0.65)', color: '#fff',
                                fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
                                fontWeight: 600, backdropFilter: 'blur(8px)',
                                fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.5px',
                                textDecoration: 'none', zIndex: 20,
                            }}
                            className="hide-mobile"
                        >
                            via {post.source === 'devto' ? 'Dev.to' : post.source === 'hashnode' ? 'Hashnode' : post.source === 'wikinews' ? 'Wikinews' : 'The Guardian'}
                        </Link>
                    )}
                    <div className="mobile-overlay-banner">
                        <h2 className="mobile-overlay-title">{post.title}</h2>
                        <div className="mobile-overlay-author">
                            <span>{post.author?.display_name ?? 'Unknown'}</span>
                        </div>
                    </div>
                </div>

                {/* Author Row */}
                <div className="author-row">
                    <Link
                        href={post.source ? `/source/${post.source}` : post.author ? `/u/${post.author.username}` : '#'}
                        onClick={e => e.stopPropagation()}
                        style={{ textDecoration: 'none' }}
                    >
                        <img src={post.author?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(post.author?.display_name || 'User')}
                            alt={post.author?.display_name || 'User'} className="avatar"
                            style={{ width: '28px', height: '28px' }} />
                    </Link>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <Link
                            href={post.source ? `/source/${post.source}` : post.author ? `/u/${post.author.username}` : '#'}
                            onClick={e => e.stopPropagation()}
                            className="author-name"
                            style={{ textDecoration: 'none' }}
                        >
                            {post.source
                                ? (post.source === 'devto'
                                    ? 'Dev.to'
                                    : post.source === 'hashnode'
                                        ? 'Hashnode'
                                        : post.source === 'wikinews'
                                            ? 'Wikinews'
                                            : post.author?.display_name ?? 'Unknown')
                                : post.author?.display_name ?? 'Unknown'}
                        </Link>
                    </div>
                    <div className="read-time" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} /> {post.read_time_minutes}m
                    </div>
                </div>

                {/* Body */}
                <div className="post-card-body">
                    <h2 className="post-card-title">{post.title}</h2>
                    {post.subtitle && <p className="post-card-excerpt">{post.subtitle}</p>}

                    {/* Tags */}
                    {post.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px', position: 'relative', zIndex: 20 }}>
                            {post.tags.slice(0, 3).map(tag => (
                                <Link key={tag.id} href={`/tag/${tag.name}`}
                                    className="tag-chip"
                                    onClick={e => e.stopPropagation()}>
                                    #{tag.name}
                                </Link>
                            ))}
                            {post.tags.length > 3 && (
                                <span className="tag-chip" style={{ background: '#f0ede8', color: 'var(--color-muted)' }}>
                                    +{post.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Engagement Bar */}
                <div className="engagement-bar" style={{ position: 'relative', zIndex: 20 }}>
                    <button
                        className={`engagement-btn ${liked ? 'liked' : ''}`}
                        onClick={handleLike}
                        aria-label={liked ? 'Unlike' : 'Like'}
                    >
                        <Heart
                            size={14}
                            fill={liked ? 'currentColor' : 'none'}
                            className={likeAnimating ? 'like-active' : ''}
                        />
                        {formatNumber(likeCount || 0)}
                    </button>

                    <button className="engagement-btn" aria-label="Comments">
                        <MessageCircle size={14} />
                        {formatNumber(commentCount || 0)}
                    </button>

                    <button className="engagement-btn" onClick={handleShare} aria-label="Share" style={{ marginLeft: 'auto' }}>
                        <Share2 size={14} />
                    </button>
                </div>
            </article>
        </div>
    );
}
