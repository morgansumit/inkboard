'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Copy, Check, Gift, Percent, ExternalLink, Tag } from 'lucide-react';

interface Coupon {
    id: string;
    title: string;
    description: string;
    code: string;
    discount: string;
    brand: string;
    coverImage: string;
    targetUrl: string;
    category: string;
    expiresAt?: string;
}

interface Post {
    id: string;
    title: string;
    subtitle?: string;
    cover_image_url?: string;
    content?: string;
    status: string;
    tags: { id: string; name: string }[];
    source?: string;
}

function formatToday() {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ExplorePage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', 'Fashion', 'Food', 'Tech', 'Travel', 'Beauty', 'Health', 'Entertainment'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [postsRes, couponsRes] = await Promise.all([
                    fetch('/api/feed?page=1'),
                    fetch('/api/coupons'),
                ]);

                if (postsRes.ok) {
                    const postsData = await postsRes.json();
                    const validPosts = (postsData.posts || [])
                        .filter((p: any) => !p.is_ad && p.status === 'PUBLISHED')
                        .slice(0, 8);
                    setPosts(validPosts);
                }

                if (couponsRes.ok) {
                    const couponsData = await couponsRes.json();
                    setCoupons(couponsData.coupons || []);
                }
            } catch (err) {
                console.error('Failed to fetch explore data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        fetch(`/api/coupons/click?id=${id}`, { method: 'POST' }).catch(() => {});
    };

    const filteredCoupons = activeCategory === 'All' 
        ? coupons 
        : coupons.filter(c => c.category === activeCategory);

    const mixedItems = [];
    const maxItems = Math.max(posts.length, filteredCoupons.length);
    for (let i = 0; i < maxItems; i++) {
        if (i < filteredCoupons.length) {
            mixedItems.push({ type: 'coupon', data: filteredCoupons[i] });
        }
        if (i < posts.length) {
            mixedItems.push({ type: 'post', data: posts[i] });
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
            <div style={{ maxWidth: '1380px', width: '90%', margin: '0 auto', padding: '24px 0 80px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#111' }}>{formatToday()}</div>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '6px 0 0', color: '#111' }}>Discover & Save</h1>
                    <p style={{ color: '#666', marginTop: '8px' }}>Explore stories and exclusive deals</p>
                </div>

                {coupons.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    background: activeCategory === cat ? '#111' : '#fff',
                                    color: activeCategory === cat ? '#fff' : '#333',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', justifyItems: 'center' }}>
                    {mixedItems.map((item, index) => {
                        if (item.type === 'coupon') {
                            const coupon = item.data as Coupon;
                            return (
                                <div key={coupon.id} style={{ width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                                    <div style={{ position: 'relative', height: '180px' }}>
                                        <img src={coupon.coverImage} alt={coupon.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '6px 12px', background: '#E94560', color: '#fff', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Gift size={14} /> Deal
                                        </div>
                                        <div style={{ position: 'absolute', bottom: '12px', left: '12px', padding: '4px 10px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                            {coupon.brand}
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f0f0f0', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '10px' }}>
                                            <Tag size={12} /> {coupon.category}
                                        </div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3, color: '#111' }}>{coupon.title}</h3>
                                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: 1.4 }}>{coupon.description.slice(0, 80)}...</p>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#111', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
                                            <Percent size={14} /> {coupon.discount}
                                        </div>
                                        <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '2px dashed #ddd' }}>
                                            <code style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, letterSpacing: '1px', color: '#111' }}>{coupon.code}</code>
                                            <button onClick={() => copyCode(coupon.code, coupon.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: copiedId === coupon.id ? '#D1FAE5' : '#111', color: copiedId === coupon.id ? '#065F46' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                                                {copiedId === coupon.id ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                                            </button>
                                        </div>
                                        <a href={coupon.targetUrl} target="_blank" rel="noopener noreferrer" onClick={() => fetch(`/api/coupons/click?id=${coupon.id}`, { method: 'POST' }).catch(() => {})} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', padding: '10px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', color: '#111', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                                            Shop Now <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            );
                        } else {
                            const post = item.data as Post;
                            return (
                                <Link key={post.id} href={`/post/${post.id}`} style={{ width: '100%', maxWidth: '380px', borderRadius: '20px', overflow: 'hidden', position: 'relative', aspectRatio: '4 / 5', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textDecoration: 'none' }}>
                                    <img src={post.cover_image_url || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80'} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '18px', gap: '6px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.9 }}>{post.subtitle || post.tags?.[0]?.name || post.source?.toUpperCase() || 'Story'}</div>
                                        <div style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1.25 }}>{post.title}</div>
                                    </div>
                                </Link>
                            );
                        }
                    })}
                </div>

                {mixedItems.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <p style={{ color: '#666' }}>No items found</p>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '48px', color: '#555' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '18px 24px', borderRadius: '18px', background: '#fff', border: '1px solid #e5e5e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Gift size={20} style={{ color: '#E94560' }} />
                        <span style={{ fontWeight: 700 }}>Discover more every day</span>
                        <span style={{ color: '#777' }}>New deals & stories added regularly</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

