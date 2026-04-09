'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Flame, Clock, Play, MoreVertical, Edit2, Trash2, Archive } from 'lucide-react';
import type { Post } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { parseVideoUrl } from '@/lib/video';
import { cardImageUrl, avatarUrl } from '@/lib/cloudinary';

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

interface VideoEmbedProps {
    url: string;
    title: string;
}

function VideoEmbed({ url, title }: VideoEmbedProps) {
    const videoInfo = parseVideoUrl(url);
    
    if (!videoInfo.embedUrl) {
        return (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#666', fontSize: '12px' }}>Invalid video URL</span>
            </div>
        );
    }
    
    if (videoInfo.type === 'direct') {
        return (
            <video
                src={videoInfo.embedUrl}
                controls
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                poster={videoInfo.thumbnailUrl || undefined}
            />
        );
    }
    
    return (
        <iframe
            src={videoInfo.embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
    );
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
    currentUserId?: string;
    onDelete?: (id: string) => void;
    onArchive?: (id: string, archived: boolean) => void;
}

export function PostCard({ post, index = 0, currentUserId, onDelete, onArchive }: PostCardProps) {
    const router = useRouter();
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.like_count || 0);
    const [commentCount, setCommentCount] = useState(post.comment_count || 0);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isAuthor, setIsAuthor] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const dynamicPaddingBottom = getPseudoRandomRatio(post.id);

    // Lazy auth check — only when user interacts (likes)
    const ensureAuth = async () => {
        if (authChecked) return isAuthenticated;
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const authed = !!session;
        setIsAuthenticated(authed);
        setAuthChecked(true);
        return authed;
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const authed = await ensureAuth();
        if (!authed) {
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

    // Check if current user is author
    useEffect(() => {
        const checkAuthor = async () => {
            if (!currentUserId) {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user && post.author_id === user.id) {
                    setIsAuthor(true);
                }
            } else if (post.author_id === currentUserId) {
                setIsAuthor(true);
            }
        };
        checkAuthor();
    }, [currentUserId, post.author_id]);

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/post/${post.id}/edit`);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
        
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
            if (res.ok) {
                onDelete?.(post.id);
                router.refresh();
            } else {
                alert('Failed to delete post');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete post');
        } finally {
            setIsDeleting(false);
            setShowMenu(false);
        }
    };

    const handleArchive = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const isArchived = post.status === 'ARCHIVED';
        
        setIsArchiving(true);
        try {
            const res = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: isArchived ? 'unarchive' : 'archive' }),
            });
            if (res.ok) {
                onArchive?.(post.id, !isArchived);
                router.refresh();
            } else {
                alert('Failed to archive post');
            }
        } catch (err) {
            console.error('Archive error:', err);
            alert('Failed to archive post');
        } finally {
            setIsArchiving(false);
            setShowMenu(false);
        }
    };

    return (
        <div
            className="masonry-item fade-up"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <article className="post-card">
                <Link href={`/post/${post.id}`} style={{ position: 'absolute', inset: 0, zIndex: 10 }} aria-label={`View ${post.title}`} />
                {/* Cover Image or Video */}
                <div style={{ position: 'relative', paddingBottom: post.video_url ? '56.25%' : dynamicPaddingBottom, height: 0, overflow: 'hidden' }}>
                    {post.video_url ? (
                        // Video embed
                        <VideoEmbed url={post.video_url} title={post.title} />
                    ) : (
                        // Cover image
                        <>
                            <img
                                src={cardImageUrl(post.cover_image_url) || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80'}
                                alt={post.title}
                                className="post-card-image"
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                loading={index < 4 ? 'eager' : 'lazy'}
                                decoding={index < 4 ? 'sync' : 'async'}
                            />
                            {post.is_trending && (
                                <div className="trending-badge">
                                    <Flame size={10} /> Trending
                                </div>
                            )}
                        </>
                    )}
                    {post.video_url && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '16px',
                            pointerEvents: 'none', zIndex: 15,
                        }}>
                            <Play size={32} color="white" fill="white" />
                        </div>
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
                        href={post.author ? `/u/${post.author.username}` : '#'}
                        onClick={e => e.stopPropagation()}
                        style={{ textDecoration: 'none' }}
                    >
                        <img src={avatarUrl(post.author?.avatar_url) || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(post.author?.display_name || 'User')}
                            alt={post.author?.display_name || 'User'} className="avatar"
                            loading="lazy" decoding="async"
                            style={{ width: '28px', height: '28px' }} />
                    </Link>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <Link
                            href={post.author ? `/u/${post.author.username}` : '#'}
                            onClick={e => e.stopPropagation()}
                            className="author-name"
                            style={{ textDecoration: 'none' }}
                        >
                            {post.author?.display_name ?? 'Unknown'}
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
                    {(post.tags?.length ?? 0) > 0 && (
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

                    <button 
                        className="engagement-btn" 
                        aria-label="Comments"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/post/${post.id}#comments`);
                        }}
                    >
                        <MessageCircle size={14} />
                        {formatNumber(commentCount || 0)}
                    </button>

                    {isAuthor && (
                        <div style={{ position: 'relative', marginLeft: 'auto' }}>
                            <button
                                className="engagement-btn"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                aria-label="Post options"
                                style={{ position: 'relative', zIndex: 30 }}
                            >
                                <MoreVertical size={14} />
                            </button>
                            
                            {showMenu && (
                                <div 
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: '100%', 
                                        right: 0, 
                                        background: 'white',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        padding: '4px',
                                        minWidth: '140px',
                                        zIndex: 40,
                                        marginBottom: '4px'
                                    }}
                                >
                                    <button
                                        onClick={handleEdit}
                                        disabled={isDeleting || isArchiving}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            textAlign: 'left',
                                            borderRadius: '4px',
                                            color: '#333'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <Edit2 size={14} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleArchive}
                                        disabled={isArchiving}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            textAlign: 'left',
                                            borderRadius: '4px',
                                            color: '#666'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <Archive size={14} />
                                        {post.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                                    </button>
                                    <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            textAlign: 'left',
                                            borderRadius: '4px',
                                            color: '#e11d48'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <Trash2 size={14} />
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {!isAuthor && (
                        <button className="engagement-btn" onClick={handleShare} aria-label="Share" style={{ marginLeft: 'auto' }}>
                            <Share2 size={14} />
                        </button>
                    )}
                </div>
            </article>
        </div>
    );
}
