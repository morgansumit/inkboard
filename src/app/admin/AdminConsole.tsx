'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, ChevronRight, Eye, FileText, Flag, Globe, LayoutDashboard, LogOut, Trash2, Users, type LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AdminView = 'dashboard' | 'business' | 'ads' | 'posts' | 'users' | 'reports' | 'geologs';

type DbTag = { id: string; name: string };
type DbPost = {
    id: string;
    title: string;
    status: string;
    like_count: number | null;
    comment_count: number | null;
    is_trending: boolean | null;
    cover_image_url?: string | null;
    created_at?: string;
    users?: { display_name?: string | null; username?: string | null } | null;
    post_tags?: { tags?: DbTag | DbTag[] | null }[] | null;
};

type DbUser = {
    id: string;
    username?: string | null;
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    is_verified?: boolean | null;
    status?: string | null;
    created_at?: string;
};

type DbBusinessRequest = {
    id: string;
    user_id: string;
    business_name?: string | null;
    website_url?: string | null;
    description?: string | null;
    status?: string | null;
    created_at?: string;
    users?: { display_name?: string | null; email?: string | null } | null;
};

type BusinessRequestMessage = {
    id: string;
    business_request_id: string;
    sender_user_id: string;
    sender_role: 'ADMIN' | 'USER';
    body: string;
    created_at: string;
    read_at?: string | null;
};

type BusinessMessagesResponse = {
    request?: DbBusinessRequest | null;
    messages?: BusinessRequestMessage[];
    error?: string;
};

type DbAd = {
    id: string;
    title?: string | null;
    target_url?: string | null;
    image_url?: string | null;
    status?: string | null;
    daily_budget?: number | null;
    total_budget?: number | null;
    created_at?: string;
};

type DbReport = {
    id?: string | number | null;
    reason?: string | null;
    type?: string | null;
    status?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
};

type DbGeoLog = {
    id?: string | number | null;
    ip_hash?: string | null;
    ip?: string | null;
    country?: string | null;
    path?: string | null;
    url?: string | null;
    created_at?: string | null;
    time?: string | null;
    [key: string]: unknown;
};

const NAV: { id: AdminView; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'business', label: 'Business Accounts', icon: Users },
    { id: 'ads', label: 'Ads Management', icon: BarChart3 },
    { id: 'posts', label: 'Post Management', icon: FileText },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'reports', label: 'Reported Content', icon: Flag },
    { id: 'geologs', label: 'Geo Block Logs', icon: Globe },
];

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableElement(el: Element | null) {
    if (!el) return false;
    if (EDITABLE_TAGS.has(el.tagName)) return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return Boolean((el as HTMLElement).closest('[data-admin-editable="true"]'));
}

type ConsoleDataResponse = {
    posts?: DbPost[];
    users?: DbUser[];
    businessRequests?: DbBusinessRequest[];
    ads?: DbAd[];
    reports?: DbReport[];
    geoLogs?: DbGeoLog[];
    cachedAt?: string;
    stale?: boolean;
    error?: string;
    warning?: string;
};

function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Unexpected error';
}

function withTimeout<T>(task: PromiseLike<T>, timeoutMs = 10000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);

        Promise.resolve(task)
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(timeoutId));
    });
}

function formatK(value?: number | null) {
    const n = value ?? 0;
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

function normalizeTags(post: DbPost): DbTag[] {
    if (!post.post_tags) return [];
    return post.post_tags
        .flatMap(item => {
            if (!item?.tags) return [];
            return Array.isArray(item.tags) ? item.tags : [item.tags];
        })
        .filter(Boolean) as DbTag[];
}

function normalizeAdminStatus(status?: string | null) {
    return String(status ?? 'PENDING').toUpperCase();
}

function getBusinessStatusStyles(status?: string | null) {
    const normalized = normalizeAdminStatus(status);

    if (normalized === 'APPROVED') {
        return {
            label: 'Approved',
            background: '#DCFCE7',
            color: '#166534',
        };
    }

    if (normalized === 'REJECTED') {
        return {
            label: 'Rejected',
            background: '#FEE2E2',
            color: '#991B1B',
        };
    }

    return {
        label: 'Pending',
        background: '#FEF3C7',
        color: '#92400E',
    };
}

export function AdminClient() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [activeView, setActiveView] = useState<AdminView>('dashboard');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [posts, setPosts] = useState<DbPost[]>([]);
    const [users, setUsers] = useState<DbUser[]>([]);
    const [businessRequests, setBusinessRequests] = useState<DbBusinessRequest[]>([]);
    const [ads, setAds] = useState<DbAd[]>([]);
    const [reports, setReports] = useState<DbReport[]>([]);
    const [geoLogs, setGeoLogs] = useState<DbGeoLog[]>([]);
    const [auxLoading, setAuxLoading] = useState(false);
    const [cachedAt, setCachedAt] = useState<string | null>(null);
    const [stale, setStale] = useState(false);
    const [manualRefreshPending, setManualRefreshPending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [businessActionPendingId, setBusinessActionPendingId] = useState<string | null>(null);
    const [openBusinessChatId, setOpenBusinessChatId] = useState<string | null>(null);
    const [businessChatLoadingId, setBusinessChatLoadingId] = useState<string | null>(null);
    const [businessChatSubmittingId, setBusinessChatSubmittingId] = useState<string | null>(null);
    const [userStatusUpdatingId, setUserStatusUpdatingId] = useState<string | null>(null);
    const [businessMessagesByRequest, setBusinessMessagesByRequest] = useState<Record<string, BusinessRequestMessage[]>>({});
    const [businessDrafts, setBusinessDrafts] = useState<Record<string, string>>({});

    const isMountedRef = useRef(true);
    const editingRef = useRef(false);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedView = window.localStorage.getItem('inkboard:last-admin-view') as AdminView | null;
        const validViews = NAV.map(item => item.id);
        if (storedView && validViews.includes(storedView)) {
            setActiveView(storedView);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('inkboard:last-admin-view', activeView);
    }, [activeView]);

    useEffect(() => {
        editingRef.current = isEditing;
    }, [isEditing]);

    useEffect(() => {
        const handleFocusIn = (event: FocusEvent) => {
            if (isEditableElement(event.target as Element | null)) {
                setIsEditing(true);
            }
        };

        const handleFocusOut = () => {
            requestAnimationFrame(() => {
                const active = document.activeElement;
                setIsEditing(isEditableElement(active));
            });
        };

        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('focusout', handleFocusOut, true);

        return () => {
            document.removeEventListener('focusin', handleFocusIn, true);
            document.removeEventListener('focusout', handleFocusOut, true);
        };
    }, []);

    const handleLogout = useCallback(async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await supabase.auth.signOut();
            router.replace('/login');
            router.refresh();
        } catch (err) {
            console.error('[admin] logout failed', err);
            alert('Failed to sign out. Please try again.');
        } finally {
            setLoggingOut(false);
        }
    }, [loggingOut, router, supabase]);

    const loadOnce = useCallback(
        async ({ background = false, force = false }: { background?: boolean; force?: boolean } = {}) => {
            if (!force && editingRef.current) {
                return;
            }

            if (!background) {
                setError(null);
            } else {
                setAuxLoading(true);
            }

            try {
                const res = await withTimeout(fetch('/api/admin/console-data', { cache: 'no-store' }), 8000);
                const data = (await res.json()) as ConsoleDataResponse;

                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to load admin data');
                }

                setPosts(data.posts ?? []);
                setUsers(data.users ?? []);
                setBusinessRequests(data.businessRequests ?? []);
                setAds(data.ads ?? []);
                setReports(data.reports ?? []);
                setGeoLogs(data.geoLogs ?? []);
                setCachedAt(typeof data.cachedAt === 'string' ? data.cachedAt : null);
                setStale(Boolean(data.stale));
            } catch (err: unknown) {
                const errorMessage = getErrorMessage(err) || 'Failed to load admin data';
                setError(errorMessage);
                
                // Set empty data on error so UI renders immediately
                setPosts([]);
                setUsers([]);
                setBusinessRequests([]);
                setAds([]);
                setReports([]);
                setGeoLogs([]);
                setCachedAt(null);
                setStale(true);
            } finally {
                setAuxLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        void loadOnce({ force: true });
    }, [loadOnce]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            void loadOnce({ background: true });
        }, 2 * 60 * 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [loadOnce]);

    const handleManualRefresh = useCallback(async () => {
        setManualRefreshPending(true);
        try {
            await loadOnce({ force: true });
        } finally {
            setManualRefreshPending(false);
        }
    }, [loadOnce]);

    const loadBusinessMessages = useCallback(async (businessRequestId: string, { background = false }: { background?: boolean } = {}) => {
        if (!background) {
            setBusinessChatLoadingId(businessRequestId);
        }

        try {
            const res = await fetch(`/api/admin/business-requests/messages?businessRequestId=${encodeURIComponent(businessRequestId)}`, {
                cache: 'no-store',
            });
            const data = (await res.json()) as BusinessMessagesResponse;

            if (!res.ok) {
                throw new Error(data?.error || 'Failed to load messages');
            }

            setBusinessMessagesByRequest(prev => ({
                ...prev,
                [businessRequestId]: data.messages ?? [],
            }));

            if (data.request) {
                setBusinessRequests(prev => prev.map(req => (req.id === businessRequestId ? { ...req, ...data.request } : req)));
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            if (!background) {
                setBusinessChatLoadingId(current => (current === businessRequestId ? null : current));
            }
        }
    }, []);

    const handleToggleBusinessChat = useCallback(async (businessRequestId: string) => {
        if (openBusinessChatId === businessRequestId) {
            setOpenBusinessChatId(null);
            return;
        }

        setOpenBusinessChatId(businessRequestId);
        await loadBusinessMessages(businessRequestId);
    }, [loadBusinessMessages, openBusinessChatId]);

    const handleSendBusinessMessage = useCallback(async (businessRequestId: string) => {
        const message = businessDrafts[businessRequestId]?.trim();
        if (!message) return;

        setBusinessChatSubmittingId(businessRequestId);
        setError(null);

        try {
            const res = await fetch('/api/admin/business-requests/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessRequestId, message }),
            });

            const data = (await res.json()) as { message?: BusinessRequestMessage; error?: string };
            if (!res.ok || !data.message) {
                throw new Error(data?.error || 'Failed to send message');
            }

            setBusinessMessagesByRequest(prev => ({
                ...prev,
                [businessRequestId]: [...(prev[businessRequestId] ?? []), data.message as BusinessRequestMessage],
            }));
            setBusinessDrafts(prev => ({
                ...prev,
                [businessRequestId]: '',
            }));
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setBusinessChatSubmittingId(current => (current === businessRequestId ? null : current));
        }
    }, [businessDrafts]);

    const handleUpdateUserStatus = useCallback(async (userId: string, newStatus: 'BANNED' | 'SHADOW_BANNED' | 'DEACTIVATED' | 'ACTIVE') => {
        setUserStatusUpdatingId(userId);
        setError(null);
        try {
            const res = await fetch('/api/admin/users/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status: newStatus }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to update user status');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setUserStatusUpdatingId(null);
        }
    }, []);

    useEffect(() => {
        if (activeView !== 'business' || !openBusinessChatId) return;

        const intervalId = window.setInterval(() => {
            void loadBusinessMessages(openBusinessChatId, { background: true });
        }, 4000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [activeView, loadBusinessMessages, openBusinessChatId]);

    const dashboardStats = useMemo(() => {
        const publishedPosts = posts.filter(p => (p.status ?? '').toUpperCase() === 'PUBLISHED').length;
        const pendingReports = reports.filter(r => String(r.status ?? '').toUpperCase() === 'PENDING').length;
        const pendingBusiness = businessRequests.filter(r => String(r.status ?? '').toUpperCase() === 'PENDING').length;
        return [
            { label: 'Total Users', value: users.length, color: '#E94560' },
            { label: 'Published Posts', value: publishedPosts, color: '#0F3460' },
            { label: 'Pending Reports', value: pendingReports, color: '#F4A261' },
            { label: 'Pending Business Requests', value: pendingBusiness, color: '#8A8A9A' },
        ];
    }, [users.length, posts, reports, businessRequests]);

    const topPosts = useMemo(() => {
        return [...posts]
            .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
            .slice(0, 5);
    }, [posts]);

    const filteredPosts = useMemo(() => {
        if (activeView !== 'posts') return posts;
        return posts;
    }, [posts, activeView]);

    const handleMarkPostRemoved = async (id: string) => {
        try {
            const res = await fetch('/api/admin/posts/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
                setError(data?.error || 'Failed to update post');
                return;
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err));
            return;
        }
        setPosts(prev => prev.map(p => (p.id === id ? { ...p, status: 'REMOVED' } : p)));
    };

    const handleUpdateBusinessStatus = async (id: string, userId: string, status: string) => {
        setBusinessActionPendingId(id);
        setError(null);
        try {
            const res = await fetch('/api/admin/business-requests/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, userId, status }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
                setError(data?.error || 'Failed to update business request');
                return;
            }
        } catch (err: unknown) {
            console.error('[admin] business request update failed', err);
            setError(getErrorMessage(err));
            return;
        } finally {
            setBusinessActionPendingId(null);
        }
        setBusinessRequests(prev => prev.map(req => (req.id === id ? { ...req, status } : req)));
        await loadOnce({ force: true });
    };

    const handleUpdateAdStatus = async (id: string, status: string) => {
        try {
            const res = await fetch('/api/admin/ads/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
                setError(data?.error || 'Failed to update ad');
                return;
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err));
            return;
        }
        setAds(prev => prev.map(ad => (ad.id === id ? { ...ad, status } : ad)));
    };

    const renderView = () => {
        if (loading) {
            return <p style={{ color: 'var(--color-muted)' }}>Loading admin data…</p>;
        }

        switch (activeView) {
            case 'dashboard':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>Dashboard Overview</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                            {dashboardStats.map(stat => (
                                <div key={stat.label} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
                                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 800, color: stat.color }}>{formatK(stat.value)}</div>
                                    <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 600 }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Top Posts</h3>
                            {topPosts.length === 0 && <p style={{ color: 'var(--color-muted)' }}>No posts found.</p>}
                            {topPosts.map(post => (
                                <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                                    <img src={post.cover_image_url || 'https://images.unsplash.com/photo-1523240795612-9a0db644?w=600&q=80'} alt={post.title} style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{post.title}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>❤️ {formatK(post.like_count)} · 💬 {formatK(post.comment_count)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'posts':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Post Management</h2>
                        <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                                        {['Title', 'Author', 'Tags', 'Status', 'Likes', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPosts.map(post => (
                                        <tr key={post.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{post.title}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-muted)' }}>{post.users?.display_name || post.users?.username || 'Unknown'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {normalizeTags(post).slice(0, 3).map(tag => (
                                                        <span key={tag.id} className="tag-chip" style={{ fontSize: '10px' }}>#{tag.name}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700 }}>{post.status}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px' }}>❤️ {formatK(post.like_count)}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <Link href={`/post/${post.id}`} title="View" style={{ color: 'var(--color-muted)', display: 'inline-flex' }}><Eye size={14} /></Link>
                                                    <button title="Remove" onClick={() => handleMarkPostRemoved(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'inline-flex' }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>User Management</h2>
                        <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                                        {['User', 'Email', 'Role', 'Verified', 'Status', 'Joined', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => {
                                        const currentStatus = user.status ?? 'ACTIVE';
                                        const statusColor = currentStatus === 'BANNED' ? '#FEE2E2' : currentStatus === 'SHADOW_BANNED' ? '#FEF3C7' : currentStatus === 'DEACTIVATED' ? '#E5E7EB' : '#D1FAE5';
                                        const statusTextColor = currentStatus === 'BANNED' ? '#991B1B' : currentStatus === 'SHADOW_BANNED' ? '#92400E' : currentStatus === 'DEACTIVATED' ? '#374151' : '#065F46';
                                        return (
                                            <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{user.display_name || user.username || 'Unnamed user'}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-muted)' }}>{user.email || '-'}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700 }}>{user.role || 'USER'}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{user.is_verified ? 'Yes' : 'No'}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, background: statusColor, color: statusTextColor }}>
                                                        {currentStatus}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-muted)' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <select
                                                        value={currentStatus}
                                                        onChange={e => handleUpdateUserStatus(user.id, e.target.value as 'ACTIVE' | 'BANNED' | 'SHADOW_BANNED' | 'DEACTIVATED')}
                                                        disabled={userStatusUpdatingId === user.id}
                                                        style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-primary)', cursor: 'pointer' }}
                                                    >
                                                        <option value="ACTIVE">Active</option>
                                                        <option value="BANNED">Ban</option>
                                                        <option value="SHADOW_BANNED">Shadow Ban</option>
                                                        <option value="DEACTIVATED">Deactivate</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'business':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Business Partner Applications</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {businessRequests.map(req => (
                                <div key={req.id} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }}>
                                    {(() => {
                                        const statusMeta = getBusinessStatusStyles(req.status);
                                        const normalizedStatus = normalizeAdminStatus(req.status);
                                        const isTerminal = normalizedStatus === 'APPROVED' || normalizedStatus === 'REJECTED';

                                        return (
                                            <>
                                    <p style={{ fontWeight: 700 }}>{req.business_name || 'Unnamed business'}</p>
                                    <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>{req.users?.display_name || 'Unknown user'} ({req.users?.email || 'no-email'})</p>
                                    <div style={{ marginTop: '8px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, background: statusMeta.background, color: statusMeta.color }}>
                                            {statusMeta.label}
                                        </span>
                                    </div>
                                    {req.description && <p style={{ marginTop: '8px', fontSize: '13px' }}>{req.description}</p>}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => void handleToggleBusinessChat(req.id)}
                                            className="btn btn-sm"
                                            style={{ background: '#111827', color: '#F9FAFB', border: 'none', cursor: 'pointer' }}
                                        >
                                            {openBusinessChatId === req.id ? 'Close messages' : 'Message'}
                                        </button>
                                    {!isTerminal && <>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateBusinessStatus(req.id, req.user_id, 'APPROVED')}
                                            disabled={businessActionPendingId === req.id}
                                            className="btn btn-sm"
                                            style={{ background: '#D1FAE5', color: '#065F46', border: 'none', cursor: 'pointer', opacity: businessActionPendingId === req.id ? 0.65 : 1 }}
                                        >
                                            {businessActionPendingId === req.id ? 'Saving…' : 'Approve'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateBusinessStatus(req.id, req.user_id, 'REJECTED')}
                                            disabled={businessActionPendingId === req.id}
                                            className="btn btn-sm"
                                            style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', cursor: 'pointer', opacity: businessActionPendingId === req.id ? 0.65 : 1 }}
                                        >
                                            Reject
                                        </button>
                                    </>}
                                    </div>
                                    {isTerminal && <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-muted)' }}>This request has already been reviewed.</p>}
                                    {openBusinessChatId === req.id && (
                                        <div style={{ marginTop: '14px', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px', background: '#FCFCFD' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '12px' }}>
                                                <div>
                                                    <p style={{ fontWeight: 700, fontSize: '13px' }}>Direct business thread</p>
                                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>Use this for offers, campaign questions, or approval follow-ups.</p>
                                                </div>
                                                {businessChatLoadingId === req.id && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Loading…</span>}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                                                {(businessMessagesByRequest[req.id] ?? []).length === 0 && (
                                                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#F3F4F6', color: '#6B7280', fontSize: '12px' }}>
                                                        No messages yet. Send the first update to this business.
                                                    </div>
                                                )}
                                                {(businessMessagesByRequest[req.id] ?? []).map(message => {
                                                    const isAdminMessage = message.sender_role === 'ADMIN';
                                                    return (
                                                        <div key={message.id} style={{ alignSelf: isAdminMessage ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                                                            <div style={{ background: isAdminMessage ? '#111827' : '#E5E7EB', color: isAdminMessage ? '#F9FAFB' : '#111827', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', lineHeight: 1.45 }}>
                                                                {message.body}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px', textAlign: isAdminMessage ? 'right' : 'left' }}>
                                                                {isAdminMessage ? 'Admin' : 'User'} · {new Date(message.created_at).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                                <textarea
                                                    value={businessDrafts[req.id] ?? ''}
                                                    onChange={event => setBusinessDrafts(prev => ({ ...prev, [req.id]: event.target.value }))}
                                                    placeholder="Send an offer, ask for campaign details, or share next steps…"
                                                    rows={3}
                                                    className="input"
                                                    style={{ resize: 'vertical', minHeight: '88px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => void handleSendBusinessMessage(req.id)}
                                                    disabled={businessChatSubmittingId === req.id || !(businessDrafts[req.id] ?? '').trim()}
                                                    className="btn btn-sm"
                                                    style={{ background: '#111827', color: '#F9FAFB', border: 'none', minWidth: '92px', height: '42px', cursor: 'pointer', opacity: businessChatSubmittingId === req.id ? 0.7 : 1 }}
                                                >
                                                    {businessChatSubmittingId === req.id ? 'Sending…' : 'Send'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ))}
                            {businessRequests.length === 0 && <p style={{ color: 'var(--color-muted)' }}>No business applications found.</p>}
                        </div>
                    </div>
                );
            case 'ads':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Sponsored Ads Management</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {ads.map(ad => (
                                <div key={ad.id} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }}>
                                    <p style={{ fontWeight: 700 }}>{ad.title || 'Untitled ad'}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>Status: {ad.status || 'PENDING'}</p>
                                    {ad.target_url && <p style={{ marginTop: '6px', fontSize: '13px' }}>URL: <a href={ad.target_url} target="_blank" style={{ color: 'var(--color-accent-2)' }}>{ad.target_url}</a></p>}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                        <button onClick={() => handleUpdateAdStatus(ad.id, 'APPROVED')} className="btn btn-sm" style={{ background: '#D1FAE5', color: '#065F46', border: 'none' }}>Approve</button>
                                        <button onClick={() => handleUpdateAdStatus(ad.id, 'REJECTED')} className="btn btn-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: 'none' }}>Reject</button>
                                        <button onClick={() => handleUpdateAdStatus(ad.id, 'PAUSED')} className="btn btn-sm" style={{ background: '#E5E7EB', color: '#111827', border: 'none' }}>Pause</button>
                                    </div>
                                </div>
                            ))}
                            {ads.length === 0 && <p style={{ color: 'var(--color-muted)' }}>No ads found.</p>}
                        </div>
                    </div>
                );
            case 'reports':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Reported Content Queue</h2>
                        {reports.length === 0 ? (
                            <p style={{ color: 'var(--color-muted)' }}>No reports found.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {reports.map((report, idx) => (
                                    <div key={String(report.id ?? idx)} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '16px', boxShadow: 'var(--shadow-card)' }}>
                                        <p style={{ fontWeight: 700, marginBottom: '6px' }}>{String(report.reason ?? report.type ?? 'Report')}</p>
                                        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Status: {String(report.status ?? 'PENDING')}</p>
                                        {'created_at' in report && <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>{new Date(String(report.created_at)).toLocaleString()}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'geologs':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Geo Block Logs</h2>
                        {geoLogs.length === 0 ? (
                            <p style={{ color: 'var(--color-muted)' }}>No geo block logs found.</p>
                        ) : (
                            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                                            {['IP', 'Country', 'Path', 'Blocked At'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {geoLogs.map((log, idx) => (
                                            <tr key={String(log.id ?? idx)} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{String(log.ip_hash ?? log.ip ?? '-')}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{String(log.country ?? '-')}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{String(log.path ?? log.url ?? '-')}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-muted)' }}>{String(log.created_at ?? log.time ?? '-')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="admin-root-shell" style={{ display: 'flex', height: '100vh', background: 'var(--color-bg)', overflow: 'hidden' }}>
            <aside className="admin-sidebar">
                <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '18px', color: 'white' }}>
                        Ink<span style={{ color: '#E94560' }}>board</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Admin Panel
                    </div>
                </div>

                {NAV.map(item => (
                    <button key={item.id} onClick={() => setActiveView(item.id)} className={`admin-nav-item ${activeView === item.id ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <item.icon size={16} />
                        {item.label}
                        {activeView === item.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                    </button>
                ))}

                <div style={{ position: 'sticky', marginTop: 'auto', bottom: '24px', width: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="admin-nav-item"
                        style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: loggingOut ? 'wait' : 'pointer', position: 'relative', opacity: loggingOut ? 0.8 : 1 }}
                        disabled={loggingOut}
                    >
                        {loggingOut ? (
                            <span className="btn-spinner" aria-hidden="true" style={{ marginRight: 8 }} />
                        ) : (
                            <LogOut size={16} />
                        )}
                        {loggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                    <Link href="/" className="admin-nav-item" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <ChevronRight size={16} /> Back to Site
                    </Link>
                </div>
            </aside>

            <main style={{ flex: 1, padding: '32px', overflowY: 'auto', height: '100vh' }}>
                {error && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#B91C1C' }}>
                        {error}
                    </div>
                )}
                {!loading && auxLoading && (
                    <div style={{ background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#B45309' }}>
                        Background refresh running…
                    </div>
                )}
                {!loading && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <button
                            onClick={handleManualRefresh}
                            disabled={manualRefreshPending}
                            className="btn btn-sm"
                            style={{ background: '#111827', color: '#F9FAFB', border: 'none', padding: '8px 14px' }}
                        >
                            {manualRefreshPending ? 'Refreshing…' : 'Refresh now'}
                        </button>
                        {cachedAt && (
                            <span style={{ fontSize: '12px', color: stale ? '#B45309' : '#2563EB' }}>
                                Cached at {new Date(cachedAt).toLocaleTimeString()} {stale ? '(stale)' : '(fresh)'}
                            </span>
                        )}
                        {isEditing && (
                            <span style={{ fontSize: '12px', color: '#DC2626' }}>
                                Auto-refresh paused while you edit.
                            </span>
                        )}
                    </div>
                )}
                {renderView()}
            </main>
        </div>
    );
}

export default AdminClient;
