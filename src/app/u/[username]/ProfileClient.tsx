'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Share2, Plus, Grid } from 'lucide-react';
import type { User, Post } from '@/types';
import { PostCard } from '@/components/PostCard';
import FollowButton from '@/components/FollowButton';

function formatK(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`; }

interface Props { 
    user: User; 
    posts: Post[]; 
    likedPosts: Post[]; 
    isOwnProfile?: boolean;
    isFollowing?: boolean;
}

export function ProfileClient({ user, posts, likedPosts, isOwnProfile = false, isFollowing = false }: Props) {
    const [activeTab, setActiveTab] = useState<'pins' | 'boards' | 'collages'>('pins');

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: `${user.display_name} on centsably`, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    const displayPosts = activeTab === 'pins' ? posts : [];

    return (
        <div style={{ background: '#f8f8f8', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px 80px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            className="input"
                            placeholder="Search your Pins"
                            style={{ width: '100%', borderRadius: '28px', padding: '12px 16px', background: '#fff', border: '1px solid #e0e0e0' }}
                        />
                    </div>
                    <div style={{ width: '40px', height: '40px' }} />
                </div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Grid size={20} color="#cc0000" />
                        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 800, margin: 0 }}>Your saved ideas</h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={user.avatar_url} alt={user.display_name} className="avatar" style={{ width: '48px', height: '48px' }} />
                            <div style={{ lineHeight: 1.2 }}>
                                <div style={{ fontWeight: 700, fontFamily: 'var(--font-ui)' }}>{user.display_name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                                    {formatK(user.follower_count || 0)} followers • {formatK(user.following_count || 0)} following
                                </div>
                            </div>
                        </div>
                        {!isOwnProfile && user.id && (
                            <FollowButton 
                                targetUserId={user.id}
                                showCounts={false}
                                initialIsFollowing={isFollowing}
                                className="min-w-[100px]"
                            />
                        )}
                        <button onClick={handleShare} className="btn btn-ghost btn-sm" style={{ padding: '10px 14px', borderRadius: '20px' }}>
                            Share profile
                        </button>
                    </div>
                </div>

                {/* Tabs + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(['pins', 'boards', 'collages'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '20px',
                                    padding: '10px 18px',
                                    background: activeTab === tab ? '#111' : '#fff',
                                    color: activeTab === tab ? '#fff' : '#333',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 120ms',
                                }}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '10px 14px', border: '1px solid #e0e0e0' }}>
                            <MapPin size={14} /> Group
                        </button>
                        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '10px 16px' }}>
                            <Plus size={14} /> Create
                        </button>
                    </div>
                </div>

                {/* Content */}
                {displayPosts.length > 0 && activeTab === 'pins' ? (
                    <div className="masonry-grid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                        {displayPosts.map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
                    </div>
                ) : (
                    <div style={{
                        background: '#fff',
                        border: '1px solid #ededed',
                        borderRadius: '16px',
                        padding: '32px',
                        textAlign: 'center',
                        boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                    }}>
                        <div style={{ fontSize: '28px', marginBottom: '12px', fontWeight: 800 }}>Organize your ideas</div>
                        <p style={{ color: '#666', fontSize: '14px', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                            Pins are sparks of inspiration. Boards are where they live. Create boards to organize your pins your way.
                        </p>
                        <button className="btn btn-primary" style={{ borderRadius: '20px', padding: '12px 18px', fontWeight: 700 }}>
                            Create a board
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
