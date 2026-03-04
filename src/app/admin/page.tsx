'use client';
import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Users, Flag, BarChart3, Globe, LogOut, ChevronRight, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { MOCK_POSTS, MOCK_USERS } from '@/lib/mockData';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'business', label: 'Business Accounts', icon: Users },
    { id: 'ads', label: 'Ads Management', icon: BarChart3 },
    { id: 'posts', label: 'Post Management', icon: FileText },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'reports', label: 'Reported Content', icon: Flag },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'geologs', label: 'Geo Block Logs', icon: Globe },
];

function formatK(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`; }

function DashboardView() {
    const stats = [
        { label: 'Total Users', value: '12,484', delta: '+284 today', color: '#E94560' },
        { label: 'Published Posts', value: '48,291', delta: '+1,204 this week', color: '#0F3460' },
        { label: 'Reports Pending', value: '17', delta: '3 new today', color: '#F4A261' },
        { label: 'Blocked IPs', value: '3,847', delta: '+12 today', color: '#8A8A9A' },
    ];
    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>Dashboard Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '14px', color: 'var(--color-primary)', marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{s.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Top Posts */}
                <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', fontFamily: 'var(--font-ui)' }}>🔥 Top Posts Today</h3>
                    {MOCK_POSTS.filter(p => p.is_trending).slice(0, 4).map(post => (
                        <div key={post.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)', marginBottom: '12px' }}>
                            <img src={post.cover_image_url} alt={post.title} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.title}</p>
                                <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '3px' }}>❤️ {formatK(post.like_count)} · 💬 {post.comment_count}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Geo Stats */}
                <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', fontFamily: 'var(--font-ui)' }}>🌍 Traffic by Country</h3>
                    {[
                        { country: '🇫🇷 France', pct: 22 },
                        { country: '🇩🇪 Germany', pct: 18 },
                        { country: '🇬🇧 UK', pct: 16 },
                        { country: '🇮🇹 Italy', pct: 12 },
                        { country: '🇳🇱 Netherlands', pct: 9 },
                        { country: '🇸🇪 Sweden', pct: 7 },
                    ].map(r => (
                        <div key={r.country} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', fontFamily: 'var(--font-ui)' }}>
                                <span>{r.country}</span><span style={{ fontWeight: 600 }}>{r.pct}%</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${r.pct}%`, background: 'var(--color-accent-2)', borderRadius: '3px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PostsView() {
    const [filter, setFilter] = useState('all');
    const [posts, setPosts] = useState(MOCK_POSTS);

    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Post Management</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {['all', 'published', 'draft', 'removed'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ border: filter !== f ? '1.5px solid var(--color-border)' : undefined, textTransform: 'capitalize' }}>
                        {f}
                    </button>
                ))}
            </div>
            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                            {['Title', 'Author', 'Tags', 'Status', 'Likes', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {posts.filter(p => filter === 'all' || p.status.toLowerCase() === filter).map(post => (
                            <tr key={post.id} style={{ borderBottom: '1px solid var(--color-border)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {post.title}
                                    </p>
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
                                    {post.author.display_name}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {post.tags.slice(0, 2).map(t => <span key={t.id} className="tag-chip" style={{ fontSize: '10px' }}>#{t.name}</span>)}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-ui)',
                                        background: post.status === 'PUBLISHED' ? '#D1FAE5' : post.status === 'DRAFT' ? '#FEF3C7' : '#FEE2E2',
                                        color: post.status === 'PUBLISHED' ? '#065F46' : post.status === 'DRAFT' ? '#92400E' : '#991B1B',
                                    }}>
                                        {post.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-ui)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                    ❤️ {formatK(post.like_count)}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <Link href={`/post/${post.id}`} title="View" style={{ color: 'var(--color-muted)', display: 'flex', alignItems: 'center' }}>
                                            <Eye size={14} />
                                        </Link>
                                        <button title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }} onClick={() => setPosts(p => p.map(x => x.id === post.id ? { ...x, status: 'REMOVED' as const } : x))}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UsersView() {
    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>User Management</h2>
            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                            {['User', 'Username', 'Role', 'Verified', 'Followers', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_USERS.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <img src={user.avatar_url} alt={user.display_name} className="avatar" style={{ width: '32px', height: '32px' }} />
                                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600 }}>{user.display_name}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>@{user.username}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-ui)',
                                        background: user.role === 'ADMIN' ? '#EDE9FE' : '#F3F4F6',
                                        color: user.role === 'ADMIN' ? '#6D28D9' : '#374151',
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    {user.is_verified
                                        ? <CheckCircle size={16} style={{ color: '#059669' }} />
                                        : <XCircle size={16} style={{ color: '#DC2626' }} />}
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
                                    {formatK(user.follower_count)}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <Link href={`/u/${user.username}`} style={{ fontSize: '12px', color: 'var(--color-accent-2)', fontWeight: 600, textDecoration: 'none' }}>View</Link>
                                        <button style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Suspend</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ReportsView() {
    const reports = [
        { id: 'r1', type: 'POST', content: MOCK_POSTS[0].title, reason: 'Misleading information', reporter: MOCK_USERS[1].display_name, date: '2026-02-25', status: 'PENDING' },
        { id: 'r2', type: 'COMMENT', content: 'Inappropriate comment on Carbonara post', reason: 'Harassment', reporter: MOCK_USERS[2].display_name, date: '2026-02-24', status: 'PENDING' },
        { id: 'r3', type: 'POST', content: MOCK_POSTS[3].title, reason: 'Spam', reporter: MOCK_USERS[0].display_name, date: '2026-02-24', status: 'RESOLVED' },
    ];
    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Reported Content Queue</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reports.map(r => (
                    <div key={r.id} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '18px 20px', boxShadow: 'var(--shadow-card)', borderLeft: `4px solid ${r.status === 'PENDING' ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: r.type === 'POST' ? '#EEF2FF' : '#FFF7ED', color: r.type === 'POST' ? 'var(--color-accent-2)' : '#EA580C', fontFamily: 'var(--font-ui)' }}>
                                        {r.type}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>{r.date}</span>
                                </div>
                                <p style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{r.content.slice(0, 60)}…</p>
                                <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Reason: <strong>{r.reason}</strong> · Reported by {r.reporter}</p>
                            </div>
                            {r.status === 'PENDING' && (
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button className="btn btn-sm" style={{ background: '#D1FAE5', color: '#065F46', border: 'none' }}>✓ Approve</button>
                                    <button className="btn btn-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: 'none' }}>✕ Remove</button>
                                </div>
                            )}
                            {r.status === 'RESOLVED' && (
                                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>✓ Resolved</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BusinessRequestsView() {
    const supabase = createClient();
    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        const fetchRequests = async () => {
            const { data } = await supabase.from('business_requests').select(`*, users(display_name, email)`).order('created_at', { ascending: false });
            if (data) setRequests(data);
        };
        fetchRequests();
    }, [supabase]);

    const handleUpdateStatus = async (id: string, userId: string, newStatus: string) => {
        await supabase.from('business_requests').update({ status: newStatus }).eq('id', id);

        if (newStatus === 'APPROVED') {
            await supabase.from('users').update({ is_business: true }).eq('id', userId);
        }

        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    };

    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Business Partner Applications</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requests.map(req => (
                    <div key={req.id} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '18px 20px', boxShadow: 'var(--shadow-card)', borderLeft: `4px solid ${req.status === 'PENDING' ? 'var(--color-accent)' : req.status === 'APPROVED' ? '#10B981' : 'var(--color-border)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: req.status === 'APPROVED' ? '#D1FAE5' : req.status === 'PENDING' ? '#FEF3C7' : '#FEE2E2', color: req.status === 'APPROVED' ? '#065F46' : req.status === 'PENDING' ? '#92400E' : '#991B1B', fontFamily: 'var(--font-ui)' }}>
                                        {req.status}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>{new Date(req.created_at).toLocaleDateString()}</span>
                                </div>
                                <p style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '18px', color: 'var(--color-primary)' }}>{req.business_name}</p>
                                <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}><strong>User:</strong> {req.users?.display_name} ({req.users?.email})</p>
                                {req.website_url && <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '8px' }}><strong>URL:</strong> <a href={req.website_url} target="_blank" style={{ color: 'var(--color-primary)' }}>{req.website_url}</a></p>}
                                <div style={{ background: 'var(--color-bg)', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
                                    <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--color-muted)', margin: 0 }}>"{req.description}"</p>
                                </div>
                            </div>
                            {req.status === 'PENDING' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                                    <button onClick={() => handleUpdateStatus(req.id, req.user_id, 'APPROVED')} className="btn btn-sm" style={{ background: '#D1FAE5', color: '#065F46', border: 'none' }}>✓ Approve Account</button>
                                    <button onClick={() => handleUpdateStatus(req.id, req.user_id, 'REJECTED')} className="btn btn-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: 'none' }}>✕ Reject</button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {requests.length === 0 && <p style={{ color: 'var(--color-muted)' }}>No business applications found.</p>}
            </div>
        </div>
    );
}

function AdsView() {
    const supabase = createClient();
    const [ads, setAds] = useState<any[]>([]);

    useEffect(() => {
        const fetchAds = async () => {
            const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
            if (data) setAds(data);
        };
        fetchAds();
    }, [supabase]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        await supabase.from('ads').update({ status: newStatus }).eq('id', id);
        setAds(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    };

    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Sponsored Ads Management</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ads.map(ad => (
                    <div key={ad.id} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '18px 20px', boxShadow: 'var(--shadow-card)', borderLeft: `4px solid ${ad.status === 'PENDING' ? 'var(--color-accent)' : ad.status === 'APPROVED' ? '#10B981' : 'var(--color-border)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                            {ad.image_url.match(/\.(mp4|webm|mov|ogg)$/i) || ad.image_url.includes('/video/upload/') ? (
                                <video src={ad.image_url} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} muted autoPlay loop playsInline />
                            ) : (
                                <img src={ad.image_url} alt="Ad" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: ad.status === 'ACTIVE' || ad.status === 'APPROVED' ? '#D1FAE5' : ad.status === 'PENDING' ? '#FEF3C7' : '#FEE2E2', color: ad.status === 'ACTIVE' || ad.status === 'APPROVED' ? '#065F46' : ad.status === 'PENDING' ? '#92400E' : '#991B1B', fontFamily: 'var(--font-ui)' }}>
                                        {ad.status}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                                </div>
                                <p style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{ad.title}</p>
                                <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>URL: <a href={ad.target_url} target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{ad.target_url}</a></p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', fontSize: '11px', color: 'var(--color-muted)' }}>
                                    {ad.daily_budget && <span style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>Daily: ${ad.daily_budget}</span>}
                                    {ad.total_budget && <span style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>Total: ${ad.total_budget}</span>}
                                    {ad.target_age_ranges?.length > 0 && <span style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>Ages: {ad.target_age_ranges.join(', ')}</span>}
                                    {ad.target_genders?.length > 0 && <span style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>Genders: {ad.target_genders.join(', ')}</span>}
                                    {ad.target_devices?.length > 0 && <span style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>Devices: {ad.target_devices.join(', ')}</span>}
                                </div>
                            </div>
                            {ad.status === 'PENDING' && (
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button onClick={() => handleUpdateStatus(ad.id, 'APPROVED')} className="btn btn-sm" style={{ background: '#D1FAE5', color: '#065F46', border: 'none' }}>✓ Approve</button>
                                    <button onClick={() => handleUpdateStatus(ad.id, 'REJECTED')} className="btn btn-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: 'none' }}>✕ Reject</button>
                                </div>
                            )}
                            {(ad.status === 'APPROVED' || ad.status === 'ACTIVE') && (
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button onClick={() => handleUpdateStatus(ad.id, 'PAUSED')} className="btn btn-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: 'none' }}>⏸ Pause</button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {ads.length === 0 && <p style={{ color: 'var(--color-muted)' }}>No ad requests found.</p>}
            </div>
        </div>
    );
}

function GeoLogsView() {
    const logs = [
        { ip: 'xxx.xxx.2.1', country: 'US', code: 'US', url: '/feed', time: '2026-02-25T11:42:00Z' },
        { ip: 'xxx.xxx.5.4', country: 'IN', code: 'IN', url: '/post/p2', time: '2026-02-25T11:38:00Z' },
        { ip: 'xxx.xxx.3.9', country: 'BR', code: 'BR', url: '/', time: '2026-02-25T11:30:00Z' },
        { ip: 'xxx.xxx.8.1', country: 'AU', code: 'AU', url: '/search?q=proust', time: '2026-02-25T11:28:00Z' },
        { ip: 'xxx.xxx.1.2', country: 'CA', code: 'CA', url: '/', time: '2026-02-25T11:15:00Z' },
    ];
    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Geo Block Logs</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '24px' }}>Non-EU requests blocked at edge. IPs are hashed for GDPR compliance.</p>
            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                            {['Hashed IP', 'Country', 'URL Attempted', 'Blocked At'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-muted)' }}>{log.ip}***</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '20px' }}>
                                        {log.country}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-primary)' }}>{log.url}</td>
                                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
                                    {new Date(log.time).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [activeView, setActiveView] = useState('dashboard');

    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView />;
            case 'business': return <BusinessRequestsView />;
            case 'posts': return <PostsView />;
            case 'users': return <UsersView />;
            case 'reports': return <ReportsView />;
            case 'ads': return <AdsView />;
            case 'geologs': return <GeoLogsView />;
            default: return <DashboardView />;
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: 'var(--color-bg)' }}>
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '18px', color: 'white' }}>
                        Ink<span style={{ color: '#E94560' }}>board</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Admin Panel
                    </div>
                </div>

                {NAV.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`admin-nav-item ${activeView === item.id ? 'active' : ''}`}
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <item.icon size={16} />
                        {item.label}
                        {activeView === item.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                    </button>
                ))}

                <div style={{ position: 'absolute', bottom: '24px', width: '240px' }}>
                    <Link href="/" className="admin-nav-item" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <LogOut size={16} /> Back to Site
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                {renderView()}
            </main>
        </div>
    );
}
