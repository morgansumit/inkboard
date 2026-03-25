'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, Trash2, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    author?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
}

interface CommentsProps {
    postId: string;
    commentCount: number;
}

export function Comments({ postId, commentCount }: CommentsProps) {
    const router = useRouter();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        // Check if user is authenticated
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();

        // Fetch comments
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const response = await fetch(`/api/posts/${postId}/comments`);
            const data = await response.json();
            if (data.comments) {
                setComments(data.comments);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newComment.trim() || isSubmitting) return;

        // Check if user is authenticated
        if (!user) {
            router.push('/register');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: newComment.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.comment) {
                    setComments(prev => [...prev, data.comment]);
                    setNewComment('');
                }
            } else {
                console.error('Failed to post comment');
            }
        } catch (error) {
            console.error('Comment submission error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!user) return;

        try {
            const response = await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            } else {
                console.error('Failed to delete comment');
            }
        } catch (error) {
            console.error('Comment deletion error:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 1) return 'just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="comments-section">
            <div className="comments-header">
                <h3>Comments ({commentCount})</h3>
            </div>

            {/* Comment Form */}
            {user ? (
                <form onSubmit={handleSubmitComment} className="comment-form">
                    <div className="comment-input-wrapper">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your thoughts..."
                            className="comment-textarea"
                            rows={3}
                            maxLength={1000}
                        />
                        <div className="comment-actions">
                            <span className="comment-count">
                                {newComment.length}/1000
                            </span>
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmitting}
                                className="comment-submit-btn"
                            >
                                <Send size={16} />
                                {isSubmitting ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="comment-login-prompt">
                    <p>Please <a href="/login">log in</a> to join the conversation.</p>
                </div>
            )}

            {/* Comments List */}
            <div className="comments-list">
                {comments.length === 0 ? (
                    <div className="no-comments">
                        <MessageCircle size={24} />
                        <p>No comments yet. Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="comment">
                            <div className="comment-avatar">
                                {comment.author?.avatar_url ? (
                                    <img 
                                        src={comment.author.avatar_url} 
                                        alt={comment.author.display_name}
                                        className="avatar-img"
                                    />
                                ) : (
                                    <div className="avatar-placeholder">
                                        <User size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="comment-content">
                                <div className="comment-header">
                                    <span className="comment-author">
                                        {comment.author?.display_name || 'Anonymous'}
                                    </span>
                                    <span className="comment-time">
                                        {formatDate(comment.created_at)}
                                    </span>
                                    {user && user.id === comment.user_id && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="comment-delete-btn"
                                            title="Delete comment"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <p className="comment-text">{comment.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx>{`
                .comments-section {
                    margin-top: 2rem;
                    padding-top: 2rem;
                    border-top: 1px solid #e5e7eb;
                }

                .comments-header h3 {
                    margin: 0 0 1.5rem 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1f2937;
                }

                .comment-form {
                    margin-bottom: 2rem;
                }

                .comment-input-wrapper {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .comment-textarea {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    outline: none;
                    resize: vertical;
                    font-family: inherit;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .comment-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                }

                .comment-count {
                    font-size: 12px;
                    color: #6b7280;
                }

                .comment-submit-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .comment-submit-btn:hover:not(:disabled) {
                    background: #2563eb;
                }

                .comment-submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .comment-login-prompt {
                    text-align: center;
                    padding: 2rem;
                    background: #f9fafb;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                }

                .comment-login-prompt a {
                    color: #3b82f6;
                    text-decoration: none;
                }

                .comment-login-prompt a:hover {
                    text-decoration: underline;
                }

                .comments-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .no-comments {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: #6b7280;
                }

                .no-comments svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .comment {
                    display: flex;
                    gap: 12px;
                    padding: 1rem;
                    background: #f9fafb;
                    border-radius: 8px;
                }

                .comment-avatar {
                    flex-shrink: 0;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    overflow: hidden;
                }

                .avatar-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #e5e7eb;
                    color: #6b7280;
                }

                .comment-content {
                    flex: 1;
                    min-width: 0;
                }

                .comment-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 6px;
                }

                .comment-author {
                    font-weight: 600;
                    color: #1f2937;
                    font-size: 14px;
                }

                .comment-time {
                    font-size: 12px;
                    color: #6b7280;
                }

                .comment-delete-btn {
                    margin-left: auto;
                    padding: 4px;
                    background: none;
                    border: none;
                    color: #6b7280;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .comment-delete-btn:hover {
                    color: #ef4444;
                    background: #fef2f2;
                }

                .comment-text {
                    margin: 0;
                    color: #374151;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
            `}</style>
        </div>
    );
}
