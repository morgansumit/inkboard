'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Flame, Clock, Calendar, Send, ChevronDown } from 'lucide-react';
import type { Post, Comment } from '@/types';
import { PostCard } from '@/components/PostCard';
import { Comments } from '@/components/Comments';
import { createClient } from '@/lib/supabase/client';
import DOMPurify from 'isomorphic-dompurify';

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatNumber(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

interface Props {
    post: Post;
    comments: Comment[];
    morePosts: Post[];
}

function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
    const [showReply, setShowReply] = useState(false);
    return (
        <div style={{ marginLeft: depth > 0 ? '44px' : '0', borderLeft: depth > 0 ? '2px solid var(--color-border)' : 'none', paddingLeft: depth > 0 ? '16px' : '0' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <img src={comment.author.avatar_url} alt={comment.author.display_name} className="avatar" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px' }}>
                        <Link href={`/u/${comment.author.username}`} className="author-name" style={{ fontSize: '14px' }}>
                            {comment.author.display_name}
                        </Link>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                            {formatDate(comment.created_at)}
                        </span>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-primary)', fontFamily: 'var(--font-ui)' }}>
                        {comment.content}
                    </p>
                    <button
                        onClick={() => setShowReply(!showReply)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '12px', fontWeight: 600, marginTop: '6px', padding: 0, fontFamily: 'var(--font-ui)' }}
                    >
                        ↩ Reply
                    </button>
                    {showReply && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <input className="input" placeholder="Write a reply…" style={{ flex: 1, fontSize: '13px' }} />
                            <button className="btn btn-primary btn-sm"><Send size={13} /></button>
                        </div>
                    )}
                </div>
            </div>
            {comment.replies?.map(r => <CommentItem key={r.id} comment={r} depth={depth + 1} />)}
        </div>
    );
}

export function PostDetailClient({ post, comments, morePosts }: Props) {
    const router = useRouter();
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [following, setFollowing] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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
                    }
                }
            } catch (error) {
                console.error('Failed to fetch engagement data:', error);
            }
        };

        fetchEngagement();
    }, [post.id]);

    const handleLike = async () => {
        // Check if user is authenticated
        if (!isAuthenticated) {
            router.push('/register');
            return;
        }

        // Optimistic UI update
        const newLikedState = !liked;
        setLiked(newLikedState);
        setLikeCount(c => liked ? c - 1 : c + 1);
        
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

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: post.title, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <div style={{ background: 'var(--color-bg)' }}>
            {/* Cover Image */}
            {!post.source && (
                <div style={{ width: '100%', maxHeight: '520px', overflow: 'hidden' }}>
                    <img src={post.cover_image_url} alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
            )}

            {/* Main Content */}
            <div className="post-detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                <article className="post-detail-article" style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
                    {/* Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {post.tags.map(tag => (
                            <Link key={tag.id} href={`/tag/${tag.name}`} className="tag-chip">
                                #{tag.name}
                            </Link>
                        ))}
                        {post.is_trending && (
                            <span className="trending-badge" style={{ position: 'static', display: 'inline-flex' }}>
                                <Flame size={10} /> Trending
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, lineHeight: 1.15, color: 'var(--color-primary)', marginBottom: '16px' }}>
                        {post.title}
                    </h1>
                    {post.subtitle && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '24px', fontStyle: 'italic' }}>
                            {post.subtitle}
                        </p>
                    )}

                    {/* Author Byline */}
                    <div className="post-detail-author-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginBottom: '36px' }}>
                        <Link href={post.source ? `/source/${post.source}` : post.author ? `/u/${post.author.username}` : '#'}>
                            <img src={post.author?.avatar_url || '/placeholder-avatar.png'} alt={post.author?.display_name ?? 'Author avatar'} className="avatar" style={{ width: '48px', height: '48px', border: '2px solid var(--color-border)' }} />
                        </Link>
                        <div style={{ flex: 1 }}>
                            <Link href={post.source ? `/source/${post.source}` : post.author ? `/u/${post.author.username}` : '#'} className="author-name" style={{ fontSize: '15px', display: 'block' }}>
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
                            <div className="post-detail-author-meta" style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-muted)', fontSize: '12px' }}>
                                    <Clock size={11} /> {post.read_time_minutes} min read
                                </span>
                                {post.published_at && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-muted)', fontSize: '12px' }}>
                                        <Calendar size={11} /> {formatDate(post.published_at)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setFollowing(!following)}
                            className={`btn btn-sm ${following ? 'btn-ghost' : 'btn-secondary'}`}
                            data-post-detail-follow-btn="true"
                            style={{ border: following ? '1.5px solid var(--color-border)' : undefined }}
                        >
                            {following ? '✓ Following' : '+ Follow'}
                        </button>
                    </div>

                    {/* Attribution Bar (if ingested external content) */}
                    {post.source && post.source_url && (
                        <div className="post-detail-attribution" style={{ padding: '16px 20px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="post-detail-attribution-text" style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                    {post.source === 'devto' ? 'Dev.to' : post.source === 'hashnode' ? 'Hashnode' : post.source === 'wikinews' ? 'Wikinews' : 'The Guardian'}
                                </span>
                                <span>• Originally published externally</span>
                                {post.source === 'wikinews' && (
                                    <span>• CC BY</span>
                                )}
                            </span>
                            <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm post-detail-attribution-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Read Original ↗
                            </a>
                        </div>
                    )}

                    {/* Article Content */}
                    <div className="prose">
                        {post.content ? (
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
                        ) : (
                            <>
                                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>

                                <blockquote>
                                    The act of reading slowly is not passive — it is an act of profound attention, a discipline that the internet age has made revolutionary.
                                </blockquote>

                                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>

                                <h2>The Art of Deep Reading</h2>

                                <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>

                                <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit.</p>

                                <h2>What Proust Teaches Us</h2>

                                <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.</p>

                                <pre><code>{`// A reader who slows down discovers
// not just words, but worlds.
const reading = (text) => {
  return new Promise(resolve => 
    setTimeout(() => resolve(understanding), Infinity)
  );
};`}</code></pre>

                                <p>Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.</p>
                            </>
                        )}
                    </div>

                    {/* Engagement Bar */}
                    <div className="post-detail-engagement" style={{
                        display: 'flex', alignItems: 'center', gap: '20px',
                        padding: '24px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)',
                        marginTop: '40px', marginBottom: '48px',
                    }}>
                        <button
                            onClick={handleLike}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: liked ? 'rgba(233,69,96,0.06)' : 'transparent',
                                border: `1.5px solid ${liked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                borderRadius: '24px', padding: '8px 20px',
                                color: liked ? 'var(--color-accent)' : 'var(--color-muted)',
                                cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600,
                                transition: 'all 150ms',
                            }}
                        >
                            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                            {formatNumber(likeCount)} Likes
                        </button>

                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-muted)', fontSize: '14px', fontFamily: 'var(--font-ui)' }}>
                            <MessageCircle size={16} />
                            {formatNumber(commentCount)} Comments
                        </span>

                        <button onClick={handleShare}
                            className="post-detail-share-btn"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'transparent', border: '1.5px solid var(--color-border)',
                                borderRadius: '24px', padding: '8px 20px',
                                color: 'var(--color-muted)', cursor: 'pointer',
                                fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600,
                                transition: 'all 150ms', marginLeft: 'auto',
                            }}>
                            <Share2 size={16} /> Share
                        </button>
                    </div>

                    {/* Comments Section */}
                    <Comments postId={post.id} commentCount={commentCount} />
                </article>
            </div>

            {/* More from author */}
            {morePosts.length > 0 && (
                <div className="more-from-section">
                    <div className="more-from-inner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <img src={post.author?.avatar_url || '/placeholder-avatar.png'} alt={post.author?.display_name ?? 'Author avatar'}
                                className="avatar" style={{ width: '40px', height: '40px' }} />
                            <div>
                                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-muted)' }}>More from</p>
                                <Link href={post.author ? `/u/${post.author.username}` : '#'} className="author-name" style={{ fontSize: '16px' }}>
                                    {post.author?.display_name ?? 'Unknown'}
                                </Link>
                            </div>
                        </div>
                        <div className="more-from-grid">
                            {morePosts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
