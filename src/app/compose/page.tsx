'use client';
import { useState, useRef } from 'react';
import { Bold, Italic, Link as LinkIcon, Quote, Code, Image, X, Eye, Video } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import type { Post } from '@/types';

const TAGS_SUGGESTIONS = ['literature', 'travel', 'food', 'tech', 'philosophy', 'poetry', 'culture', 'politics', 'health', 'fiction'];

export default function ComposePage() {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [published, setPublished] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    const readTime = Math.max(1, Math.ceil(content.split(' ').length / 200));

    const uploadImage = async (file: File) => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'djxv1usyv';
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
        
        console.log('[uploadImage] Starting upload with:', { cloudName, uploadPreset, fileSize: file.size });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            
            const data = await res.json();
            console.log('[uploadImage] Cloudinary response:', data);
            
            if (!res.ok) {
                console.error('[uploadImage] Upload failed:', data);
                throw new Error(data.error?.message || data.message || 'Upload failed');
            }
            
            if (!data.secure_url) {
                throw new Error('No secure_url in response');
            }
            
            console.log('[uploadImage] Upload successful:', data.secure_url);
            return data.secure_url;
        } catch (error) {
            console.error('[uploadImage] Upload error:', error);
            throw error;
        }
    };

    const handlePublish = async () => {
        if (publishing) return;
        if (!title || !content || tags.length === 0 || !coverImage) {
            alert('Please add a title, body content, cover image, and at least one tag.');
            return;
        }

        setPublishing(true);
        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    subtitle,
                    content,
                    cover_image_url: coverImage,
                    video_url: videoUrl,
                    cover_aspect_ratio: '4:3',
                    tags,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to publish');

            const createdId = data?.post?.id;
            if (createdId) {
                window.location.href = `/post/${createdId}`;
                return;
            }
            setPublished(true);
        } catch (e) {
            console.error(e);
            alert('Failed to publish. Please try again.');
        } finally {
            setPublishing(false);
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
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload image. Please try again.';
            alert(`Upload failed: ${errorMessage}. Please try pasting an image URL instead.`);
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

    const previewPost: Post = {
        id: 'preview', author_id: 'u3',
        author: {
            id: 'u3', email: '', username: 'you', display_name: 'You',
            avatar_url: 'https://i.pravatar.cc/150?img=25',
            role: 'USER', is_verified: false, is_suspended: false, is_business: false,
            created_at: new Date().toISOString(), follower_count: 0,
            following_count: 0, total_likes: 0, post_count: 0,
        },
        title: title || 'Your Post Title',
        subtitle: subtitle || 'Your post subtitle or excerpt',
        cover_image_url: coverImage,
        video_url: videoUrl,
        cover_aspect_ratio: '4:3',
        status: 'DRAFT', read_time_minutes: readTime,
        engagement_score: 0, like_count: 0, comment_count: 0, share_count: 0,
        is_trending: false, tags: tags.map((t, i) => ({ id: `t${i}`, name: t, post_count: 0 })),
        created_at: new Date().toISOString(),
    };

    if (published) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '60px' }}>🎉</div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 800 }}>Your story is live!</h1>
                <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>It's now appearing in the purseable feed for readers across Europe.</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <a href="/post/p1" className="btn btn-primary">View your post →</a>
                    <a href="/compose" className="btn btn-secondary">Write another</a>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
            {/* Composer Top Bar */}
            <div style={{
                position: 'sticky', top: '64px', zIndex: 30,
                background: 'rgba(247,245,242,0.95)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--color-border)',
                padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px',
            }}>
                <a href="/" style={{ color: 'var(--color-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                    <X size={14} /> Exit
                </a>
                <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
                    {title ? `"${title.slice(0, 30)}${title.length > 30 ? '…' : ''}"` : 'New Post'}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(!showPreview)}>
                        <Eye size={14} /> {showPreview ? 'Edit' : 'Preview'}
                    </button>
                    <button className="btn btn-secondary btn-sm">Save Draft</button>
                    <button
                        className="btn btn-primary btn-sm"
                        disabled={!title || !content || tags.length === 0 || !coverImage}
                        onClick={() => setShowPublishModal(true)}
                        style={{ opacity: (!title || !content || tags.length === 0 || !coverImage) ? 0.5 : 1 }}
                    >
                        Publish ✓
                    </button>
                </div>
            </div>

            <div className="composer-container">
                {/* Editor Pane */}
                {!showPreview && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                        {/* Cover Image - REQUIRED */}
                        <div style={{ 
                            border: coverImage ? '2px solid var(--color-accent)' : '2px dashed var(--color-error, #e94560)', 
                            borderRadius: '12px', 
                            padding: '20px',
                            background: coverImage ? 'rgba(233, 69, 96, 0.05)' : 'rgba(233, 69, 96, 0.1)'
                        }}>
                            <label style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '12px', color: coverImage ? 'var(--color-accent)' : 'var(--color-error, #e94560)' }}>
                                <Image size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                                Cover Image (REQUIRED) {!coverImage && '⚠️'}
                            </label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                    disabled={isUploadingCover}
                                    style={{ display: 'none' }}
                                    id="cover-upload"
                                />
                                <label htmlFor="cover-upload" className="btn btn-primary" style={{ cursor: 'pointer', opacity: isUploadingCover ? 0.7 : 1, fontWeight: 600 }}>
                                    {isUploadingCover ? 'Uploading...' : coverImage ? 'Change Image' : 'Upload Image *'}
                                </label>
                                <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>OR</span>
                                <input 
                                    className="input" 
                                    style={{ flex: 1, borderColor: coverImage ? 'var(--color-accent)' : 'var(--color-error, #e94560)' }} 
                                    placeholder="Paste image URL... *" 
                                    value={coverImage} 
                                    onChange={e => setCoverImage(e.target.value)} 
                                />
                            </div>

                            {coverImage && (
                                <div style={{ marginTop: '16px', borderRadius: '10px', overflow: 'hidden', height: '200px', border: '3px solid var(--color-accent)' }}>
                                    <img src={coverImage} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                            
                            {!coverImage && (
                                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-error, #e94560)', fontWeight: 600 }}>
                                    ⚠️ Cover image is required to publish your post
                                </div>
                            )}
                        </div>

                        {/* Video URL */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                                <Video size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                Video URL <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(YouTube, Vimeo, or direct video)</span>
                            </label>
                            <input
                                className="input"
                                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                                style={{ width: '100%' }}
                            />
                            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-muted)' }}>
                                If video URL is provided, it will be shown as the main media on the card. Blog detail shows text only.
                            </div>
                            {videoUrl && (
                                <div style={{ marginTop: '10px', padding: '10px', background: 'var(--color-bg)', borderRadius: '8px', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--color-accent)' }}>Video will be embedded from: {videoUrl.slice(0, 60)}...</span>
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <div>
                            <textarea
                                placeholder="Your post title…"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                rows={2}
                                style={{
                                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                                    fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 800,
                                    resize: 'none', color: 'var(--color-primary)', lineHeight: 1.2,
                                }}
                            />
                        </div>

                        {/* Subtitle */}
                        <div>
                            <input
                                className="input" style={{ fontSize: '16px', fontStyle: 'italic', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border)', borderRadius: 0, paddingLeft: 0 }}
                                placeholder="Subtitle or excerpt (optional)…"
                                value={subtitle}
                                onChange={e => setSubtitle(e.target.value)}
                            />
                        </div>

                        {/* Rich Text Editor */}
                        <div className="tiptap-editor">
                            {/* Toolbar */}
                            <div className="tiptap-toolbar">
                                {[
                                    { icon: <Bold size={14} />, cmd: 'bold', label: 'Bold' },
                                    { icon: <Italic size={14} />, cmd: 'italic', label: 'Italic' },
                                    { icon: <span style={{ textDecoration: 'underline', fontSize: '14px', fontWeight: 700 }}>U</span>, cmd: 'underline', label: 'Underline' },
                                ].map(item => (
                                    <button key={item.cmd} className="tiptap-btn" onClick={() => execFormat(item.cmd)} aria-label={item.label} title={item.label}>
                                        {item.icon}
                                    </button>
                                ))}
                                <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 4px' }} />
                                <button className="tiptap-btn" onClick={() => execFormat('formatBlock', 'h2')} title="Heading 2">H2</button>
                                <button className="tiptap-btn" onClick={() => execFormat('formatBlock', 'h3')} title="Heading 3">H3</button>
                                <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 4px' }} />
                                <button className="tiptap-btn" onClick={() => execFormat('formatBlock', 'blockquote')} title="Blockquote"><Quote size={14} /></button>
                                <button className="tiptap-btn" onClick={() => execFormat('formatBlock', 'pre')} title="Code Block"><Code size={14} /></button>
                                <button className="tiptap-btn" onClick={() => {
                                    const url = prompt('Enter link URL:');
                                    if (url) execFormat('createLink', url);
                                }} title="Insert Link"><LinkIcon size={14} /></button>
                                <button className="tiptap-btn" onClick={() => {
                                    const action = prompt('Enter image URL directly, or type "upload" to select a file:');
                                    if (action) {
                                        if (action.toLowerCase() === 'upload') {
                                            const fileInput = document.createElement('input');
                                            fileInput.type = 'file';
                                            fileInput.accept = 'image/*';
                                            fileInput.onchange = async (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (file) {
                                                    try {
                                                        const uploadedUrl = await uploadImage(file);
                                                        execFormat('insertImage', uploadedUrl);
                                                    } catch (error) {
                                                        alert('Failed to upload image.');
                                                    }
                                                }
                                            };
                                            fileInput.click();
                                        } else {
                                            execFormat('insertImage', action);
                                        }
                                    }
                                }} title="Insert Image"><Image size={14} /></button>
                            </div>

                            {/* Content Editable */}
                            <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={e => setContent((e.target as HTMLDivElement).innerHTML)}
                                data-placeholder="Tell your story…"
                                className="tiptap-content prose"
                                style={{ minHeight: '320px', outline: 'none', padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px', background: '#fff' }}
                            />
                            <div style={{ marginTop: '8px', color: 'var(--color-muted)', fontSize: '12px' }}>Tip: paste images or use the toolbar to format.</div>
                        </div>

                        {/* Plain body fallback */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Body (quick text)</label>
                            <textarea
                                className="input"
                                placeholder="Write your post content here..."
                                value={content.replace(/<[^>]*>/g, '')}
                                onChange={e => setContent(e.target.value)}
                                rows={8}
                                style={{ width: '100%', borderRadius: '12px', padding: '12px', border: '1px solid var(--color-border)', background: '#fff' }}
                            />
                            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-muted)' }}>We’ll publish the formatted version if you used the rich text area above.</div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                                Tags <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(max 10, at least 1 required)</span>
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                {tags.map(tag => (
                                    <span key={tag} className="tag-chip" style={{ paddingRight: '6px' }}>
                                        #{tag}
                                        <button onClick={() => setTags(t => t.filter(x => x !== tag))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: '4px', lineHeight: 1 }}>
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    className="input"
                                    placeholder="Add a tag…"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-secondary btn-sm" onClick={() => addTag(tagInput)}>Add</button>
                            </div>
                            {/* Suggestions */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                                {TAGS_SUGGESTIONS.filter(t => !tags.includes(t)).map(t => (
                                    <button key={t} onClick={() => addTag(t)}
                                        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', transition: 'all 150ms' }}>
                                        +{t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Pane */}
                {(showPreview || true) && (
                    <div style={showPreview ? { gridColumn: '1 / -1' } : {}}>
                        <div style={{ position: 'sticky', top: '128px' }}>
                            <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                                Feed Preview
                            </h3>
                            <div style={{ maxWidth: '260px' }}>
                                <PostCard post={previewPost} index={0} />
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '12px', fontFamily: 'var(--font-ui)' }}>
                                ~{readTime} min read
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Publish Modal */}
            {showPublishModal && (
                <div className="modal-overlay" onClick={() => setShowPublishModal(false)}>
                    <div className="modal-panel" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                            Ready to publish?
                        </h2>
                        <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '24px' }}>
                            Your post will immediately appear in the purseable feed across Europe.
                        </p>

                        <div style={{ background: 'var(--color-bg)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                            <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{title}</p>
                            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '10px' }}>{subtitle}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {tags.map(t => <span key={t} className="tag-chip">#{t}</span>)}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowPublishModal(false)} style={{ flex: 1, border: '1.5px solid var(--color-border)' }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={async () => { setShowPublishModal(false); await handlePublish(); }} style={{ flex: 2 }} disabled={publishing}>
                                🚀 Publish Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
