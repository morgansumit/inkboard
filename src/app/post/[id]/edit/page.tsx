'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Bold, Italic, Link as LinkIcon, Quote, Code, Image, X, Eye, Video, ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import type { Post } from '@/types';

const TAGS_SUGGESTIONS = ['literature', 'travel', 'food', 'tech', 'philosophy', 'poetry', 'culture', 'politics', 'health', 'fiction'];

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params?.id as string;

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAuthor, setIsAuthor] = useState(false);
    const [post, setPost] = useState<Post | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Load existing post data
    useEffect(() => {
        const loadPost = async () => {
            if (!postId) return;
            
            try {
                const res = await fetch(`/api/posts/${postId}`);
                const data = await res.json();
                
                if (!res.ok || !data.post) {
                    alert('Post not found');
                    router.push('/');
                    return;
                }

                if (!data.isAuthor) {
                    alert('You are not authorized to edit this post');
                    router.push(`/post/${postId}`);
                    return;
                }

                const p = data.post;
                setPost(p);
                setTitle(p.title || '');
                setSubtitle(p.subtitle || '');
                setContent(p.content?.html || p.content || '');
                setTags(p.tags?.map((t: any) => t.name) || []);
                setVideoUrl(p.video_url || '');
                setCoverImage(p.cover_image_url || '');
                setIsAuthor(true);
            } catch (err) {
                console.error('Failed to load post:', err);
                alert('Failed to load post');
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [postId, router]);

    // Sync editor content
    useEffect(() => {
        if (editorRef.current && content) {
            editorRef.current.innerHTML = content;
        }
    }, [loading]);

    const readTime = Math.max(1, Math.ceil(content.split(' ').filter(w => w.length > 0).length / 200));

    const uploadImage = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'djxv1usyv'}/image/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        return data.secure_url;
    };

    const handleSave = async () => {
        if (saving) return;
        if (!title || !content || tags.length === 0 || !coverImage) {
            alert('Please add a title, body content, cover image, and at least one tag.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    subtitle,
                    content,
                    cover_image_url: coverImage,
                    video_url: videoUrl,
                    read_time_minutes: readTime,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to save');

            router.push(`/post/${postId}`);
        } catch (e) {
            console.error(e);
            alert('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingCover(true);
        try {
            const url = await uploadImage(file);
            setCoverImage(url);
        } catch (error) {
            console.error('Error uploading image', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsUploadingCover(false);
        }
    };

    const execFormat = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
        if (editorRef.current) setContent(editorRef.current.innerHTML);
    };

    const addTag = (tag: string) => {
        const clean = tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (clean && !tags.includes(clean) && tags.length < 10) {
            setTags(t => [...t, clean]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => setTags(t => t.filter(x => x !== tag));

    if (loading) {
        return (
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
                <p>Loading post...</p>
            </div>
        );
    }

    if (!isAuthor) {
        return null;
    }

    const previewPost: Post = {
        id: postId,
        author_id: post?.author_id || '',
        author: post?.author,
        title,
        subtitle,
        content,
        cover_image_url: coverImage,
        cover_aspect_ratio: '4:3',
        status: 'PUBLISHED',
        read_time_minutes: readTime,
        engagement_score: 0,
        like_count: post?.like_count || 0,
        comment_count: post?.comment_count || 0,
        share_count: 0,
        is_trending: false,
        tags: tags.map(name => ({ id: name, name, post_count: 0 })),
        created_at: post?.created_at || new Date().toISOString(),
        published_at: post?.published_at || new Date().toISOString(),
        video_url: videoUrl || null,
    };

    return (
        <div className="compose-page" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <button
                    onClick={() => router.push(`/post/${postId}`)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                    }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, flex: 1 }}>Edit Post</h1>
                <button
                    onClick={() => setShowPreview(!showPreview)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        background: showPreview ? '#111' : 'white',
                        color: showPreview ? 'white' : '#333',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    <Eye size={16} />
                    {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !title || !content || tags.length === 0 || !coverImage}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: saving ? '#999' : '#111',
                        color: 'white',
                        cursor: saving || !title || !content || tags.length === 0 || !coverImage ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        opacity: saving || !title || !content || tags.length === 0 || !coverImage ? 0.6 : 1
                    }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {showPreview ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '40px' }}>
                    <div>
                        <PostCard post={previewPost} />
                    </div>
                    <div style={{ padding: '24px', background: '#f8f8f8', borderRadius: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Preview Mode</h3>
                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                            This is how your post will appear in the feed.
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '24px' }}>
                    {/* Title */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Enter your post title..."
                            style={{
                                width: '100%',
                                padding: '16px 20px',
                                fontSize: '24px',
                                fontWeight: 700,
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                outline: 'none',
                                fontFamily: 'var(--font-serif, Georgia, serif)'
                            }}
                        />
                    </div>

                    {/* Subtitle */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Subtitle (optional)
                        </label>
                        <input
                            type="text"
                            value={subtitle}
                            onChange={e => setSubtitle(e.target.value)}
                            placeholder="A brief description of your post..."
                            style={{
                                width: '100%',
                                padding: '14px 18px',
                                fontSize: '18px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '10px',
                                outline: 'none',
                                fontStyle: 'italic'
                            }}
                        />
                    </div>

                    {/* Cover Image */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Cover Image
                        </label>
                        {coverImage ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img src={coverImage} alt="Cover" style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '12px' }} />
                                <button
                                    onClick={() => setCoverImage('')}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: '#111',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <label style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '200px',
                                height: '150px',
                                border: '2px dashed #ccc',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: '#f8f8f8'
                            }}>
                                {isUploadingCover ? (
                                    <span style={{ fontSize: '14px', color: '#666' }}>Uploading...</span>
                                ) : (
                                    <>
                                        <Image size={32} color="#999" />
                                        <span style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Upload cover</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} disabled={isUploadingCover} />
                            </label>
                        )}
                    </div>

                    {/* Video URL */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Video URL (optional)
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                                placeholder="Paste YouTube, Vimeo, or direct video URL..."
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '10px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Content Editor */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Content
                        </label>
                        {/* Toolbar */}
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '8px 12px',
                            background: '#f5f5f5',
                            border: '2px solid #e0e0e0',
                            borderBottom: 'none',
                            borderRadius: '10px 10px 0 0'
                        }}>
                            <button onClick={() => execFormat('bold')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <Bold size={16} />
                            </button>
                            <button onClick={() => execFormat('italic')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <Italic size={16} />
                            </button>
                            <button onClick={() => execFormat('createLink', prompt('Enter URL:') || '')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <LinkIcon size={16} />
                            </button>
                            <button onClick={() => execFormat('formatBlock', 'blockquote')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <Quote size={16} />
                            </button>
                            <button onClick={() => execFormat('formatBlock', 'pre')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <Code size={16} />
                            </button>
                            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#999', padding: '6px' }}>
                                {readTime} min read
                            </span>
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable
                            onInput={(e) => setContent(e.currentTarget.innerHTML)}
                            style={{
                                minHeight: '300px',
                                padding: '20px',
                                fontSize: '16px',
                                lineHeight: 1.7,
                                border: '2px solid #e0e0e0',
                                borderRadius: '0 0 10px 10px',
                                outline: 'none',
                                fontFamily: 'var(--font-body, Georgia, serif)'
                            }}
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Tags
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                            {tags.map(tag => (
                                <span key={tag} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: '#111',
                                    color: 'white',
                                    borderRadius: '20px',
                                    fontSize: '13px'
                                }}>
                                    #{tag}
                                    <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    addTag(tagInput);
                                }
                            }}
                            placeholder="Add tags (press Enter or comma to add)"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                fontSize: '14px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '10px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                            {TAGS_SUGGESTIONS.filter(t => !tags.includes(t)).map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => addTag(tag)}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '16px',
                                        background: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
