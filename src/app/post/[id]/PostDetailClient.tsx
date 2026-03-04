'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Flame, Clock, Calendar, Send, ChevronDown } from 'lucide-react';
import type { Post, Comment } from '@/types';
import { PostCard } from '@/components/PostCard';
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
    const [liked, setLiked] = useState(post.is_liked ?? false);
    const [likeCount, setLikeCount] = useState(post.like_count);
    const [newComment, setNewComment] = useState('');
    const [commentList, setCommentList] = useState(comments);
    const [following, setFollowing] = useState(false);

    const handleLike = () => {
        setLiked(!liked);
        setLikeCount(c => liked ? c - 1 : c + 1);
    };

    const handleComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        const optimisticComment: Comment = {
            id: `c${Date.now()}`,
            post_id: post.id,
            author: {
                id: 'u0', email: '', username: 'you', display_name: 'You',
                avatar_url: 'https://i.pravatar.cc/150?img=70',
                role: 'USER', is_verified: false, is_suspended: false, is_business: false,
                created_at: new Date().toISOString(), follower_count: 0,
                following_count: 0, total_likes: 0, post_count: 0,
            },
            content: newComment,
            is_hidden: false,
            created_at: new Date().toISOString(),
            replies: [],
        };
        setCommentList(c => [optimisticComment, ...c]);
        setNewComment('');
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '1100px', margin: '0 auto', padding: '0 24px', gap: '40px' }}>
                <article style={{ maxWidth: '720px', margin: '0 auto', width: '100%', paddingTop: '40px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginBottom: '36px' }}>
                        <Link href={post.source ? `/source/${post.source}` : `/u/${post.author.username}`}>
                            <img src={post.author.avatar_url} alt={post.author.display_name} className="avatar" style={{ width: '48px', height: '48px', border: '2px solid var(--color-border)' }} />
                        </Link>
                        <div style={{ flex: 1 }}>
                            <Link href={post.source ? `/source/${post.source}` : `/u/${post.author.username}`} className="author-name" style={{ fontSize: '15px', display: 'block' }}>
                                {post.source ? (post.source === 'devto' ? 'Dev.to' : post.source === 'hashnode' ? 'Hashnode' : post.source === 'wikinews' ? 'Wikinews' : post.author.display_name) : post.author.display_name}
                            </Link>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
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
                            style={{ border: following ? '1.5px solid var(--color-border)' : undefined }}
                        >
                            {following ? '✓ Following' : '+ Follow'}
                        </button>
                    </div>

                    {/* Attribution Bar (if ingested external content) */}
                    {post.source && post.source_url && (
                        <div style={{ padding: '16px 20px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                    {post.source === 'devto' ? 'Dev.to' : post.source === 'hashnode' ? 'Hashnode' : post.source === 'wikinews' ? 'Wikinews' : 'The Guardian'}
                                </span>
                                <span>• Originally published externally</span>
                                {post.source === 'wikinews' && (
                                    <span>• CC BY</span>
                                )}
                            </span>
                            <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
                    <div style={{
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
                            {commentList.length} Comments
                        </span>

                        <button onClick={handleShare}
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
                    <section>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
                            Comments ({commentList.length})
                        </h2>

                        {/* Comment Input */}
                        <form onSubmit={handleComment} style={{ display: 'flex', gap: '12px', marginBottom: '32px', alignItems: 'flex-start' }}>
                            <img src="https://i.pravatar.cc/150?img=70" alt="You" className="avatar" style={{ width: '40px', height: '40px', flexShrink: 0, marginTop: '4px' }} />
                            <div style={{ flex: 1 }}>
                                <textarea
                                    className="input"
                                    placeholder="Share your thoughts…"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    rows={3}
                                    style={{ resize: 'none', fontFamily: 'var(--font-ui)', marginBottom: '8px' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={!newComment.trim()}>
                                        <Send size={13} /> Publish comment
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Comment List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {commentList.map(c => <CommentItem key={c.id} comment={c} />)}
                        </div>
                    </section>
                </article>
            </div>

            {/* More from author */}
            {morePosts.length > 0 && (
                <div style={{ padding: '48px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', marginTop: '48px' }}>
                    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <img src={post.author.avatar_url} alt={post.author.display_name}
                                className="avatar" style={{ width: '40px', height: '40px' }} />
                            <div>
                                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-muted)' }}>More from</p>
                                <Link href={`/u/${post.author.username}`} className="author-name" style={{ fontSize: '16px' }}>
                                    {post.author.display_name}
                                </Link>
                            </div>
                        </div>
                        <div className="masonry-grid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                            {morePosts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
