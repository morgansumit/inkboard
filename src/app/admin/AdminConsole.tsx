'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, ChevronRight, Eye, FileText, Flag, Gift, Globe, LayoutDashboard, LogOut, Megaphone, Shield, Trash2, Users, type LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AdminView = 'dashboard' | 'business' | 'ads' | 'posts' | 'users' | 'reports' | 'geologs' | 'broadcasts';

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
    country_code?: string | null;
    source_platform?: string | null;
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
    reporter_id?: string | null;
    content_type?: string | null;
    content_id?: string | null;
    reason?: string | null;
    resolution_note?: string | null;
    type?: string | null;
    status?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
};

type DbGeoLog = {
    id: string;
    ip?: string | null;
    ip_hash?: string | null;
    country?: string | null;
    path?: string | null;
    url?: string | null;
    time?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
};

type DbBroadcast = {
    id: string;
    title: string;
    body: string;
    message_type: 'ANNOUNCEMENT' | 'OFFER' | 'UPDATE' | 'URGENT';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    is_active: boolean;
    scheduled_at: string;
    expires_at?: string | null;
    created_at: string;
    created_by?: string | null;
    creator?: { id: string; username: string; display_name: string } | null;
    delivery_stats?: { count: number } | null;
};

const NAV: { id: AdminView; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'business', label: 'Business Accounts', icon: Users },
    { id: 'ads', label: 'Ads Management', icon: BarChart3 },
    { id: 'posts', label: 'Post Management', icon: FileText },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'reports', label: 'Reports', icon: Flag },
    { id: 'geologs', label: 'Geo Logs', icon: Globe },
    { id: 'broadcasts', label: 'Broadcast Messages', icon: Megaphone },
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
    const [broadcasts, setBroadcasts] = useState<DbBroadcast[]>([]);
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
    const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', message_type: 'ANNOUNCEMENT' as const, priority: 'NORMAL' as const, scheduled_at: '', expires_at: '' });
    const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
    const [reportActionPendingId, setReportActionPendingId] = useState<string | null>(null);
    
    // Admin post creation form state
    const [postForm, setPostForm] = useState({ 
        title: '', 
        subtitle: '', 
        content: '', 
        cover_image_url: '', 
        tags: '',
        country_code: '',
        isUploading: false 
    });
    const [postSubmitting, setPostSubmitting] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [postRemovingId, setPostRemovingId] = useState<string | null>(null);

    const isMountedRef = useRef(true);
    const editingRef = useRef(false);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedView = window.localStorage.getItem('purseable:last-admin-view') as AdminView | null;
        const validViews = NAV.map(item => item.id);
        if (storedView && validViews.includes(storedView)) {
            setActiveView(storedView);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('purseable:last-admin-view', activeView);
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
            const signOutPromise = supabase.auth.signOut({ scope: 'local' });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('signout_timeout')), 2000)
            );
            try {
                await Promise.race([signOutPromise, timeoutPromise]);
            } catch {
                // timeout or signOut error — proceed with forced cleanup
            }
        } catch {
            // unexpected error — proceed with forced cleanup
        }
        document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.split('=');
            const t = name.trim();
            if (t.includes('supabase') || t.includes('sb-')) {
                document.cookie = `${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
        });
        sessionStorage.clear();
        window.location.replace('/login');
    }, [loggingOut, supabase]);

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
                const url = force ? '/api/admin/console-data?bust=1' : '/api/admin/console-data';
                const res = await withTimeout(fetch(url, { cache: 'no-store' }), 8000);
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
        setPostRemovingId(id);
        setError(null);
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
        } finally {
            setPostRemovingId(null);
        }
        setPosts(prev => prev.map(p => (p.id === id ? { ...p, status: 'REMOVED' } : p)));
    };

    const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss') => {
        setReportActionPendingId(reportId);
        try {
            const res = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: reportId, action }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || 'Failed to update report');
                return;
            }
            setReports(prev => prev.map(r =>
                String(r.id) === reportId ? { ...r, status: data.status } : r
            ));
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setReportActionPendingId(null);
        }
    };

    const loadBroadcasts = useCallback(async () => {
    try {
        const res = await fetch('/api/admin/broadcasts');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load broadcasts');
        setBroadcasts(data.broadcasts || []);
    } catch (err: unknown) {
        console.error('[admin] failed to load broadcasts:', err);
        setBroadcasts([]);
    }
}, []);

    useEffect(() => {
        if (activeView === 'broadcasts') {
            void loadBroadcasts();
        }
    }, [activeView, loadBroadcasts]);

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

    const handleCreateBroadcast = async () => {
        if (!broadcastForm.title.trim() || !broadcastForm.body.trim()) {
            setError('Title and message are required');
            return;
        }
        setBroadcastSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/broadcasts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: broadcastForm.title.trim(),
                    body: broadcastForm.body.trim(),
                    message_type: broadcastForm.message_type,
                    priority: broadcastForm.priority,
                    scheduled_at: broadcastForm.scheduled_at || new Date().toISOString(),
                    expires_at: broadcastForm.expires_at || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to create broadcast');
            
            // Reset form and reload broadcasts
            setBroadcastForm({ title: '', body: '', message_type: 'ANNOUNCEMENT', priority: 'NORMAL', scheduled_at: '', expires_at: '' });
            await loadBroadcasts();
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setBroadcastSubmitting(false);
        }
    };

    const handleCreatePost = async () => {
        if (!postForm.title.trim() || !postForm.content.trim() || !postForm.cover_image_url.trim()) {
            setError('Title, content, and cover image are required');
            return;
        }
        setPostSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: postForm.title.trim(),
                    subtitle: postForm.subtitle.trim(),
                    content: postForm.content.trim(),
                    cover_image_url: postForm.cover_image_url.trim(),
                    tags: postForm.tags.split(',').map(t => t.trim()).filter(Boolean),
                    country_code: postForm.country_code || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to create post');
            
            // Reset form and reload posts
            setPostForm({ title: '', subtitle: '', content: '', cover_image_url: '', tags: '', country_code: '', isUploading: false });
            setShowCreatePost(false);
            await loadOnce({ force: true });
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setPostSubmitting(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPostForm(prev => ({ ...prev, isUploading: true }));
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
            const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'djxv1usyv'}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            setPostForm(prev => ({ ...prev, cover_image_url: data.secure_url }));
        } catch (error) {
            console.error('Error uploading image', error);
            setError('Failed to upload image. Please try again.');
        } finally {
            setPostForm(prev => ({ ...prev, isUploading: false }));
        }
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700 }}>Post Management</h2>
                            <button 
                                onClick={() => setShowCreatePost(!showCreatePost)}
                                className="btn btn-primary"
                                style={{ fontSize: '13px', padding: '8px 16px' }}
                            >
                                {showCreatePost ? 'Cancel' : '+ Create Post'}
                            </button>
                        </div>

                        {/* Create Post Form */}
                        {showCreatePost && (
                            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-card)', border: '2px solid var(--color-accent)' }}>
                                <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>Create New Post</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Title */}
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Title *</label>
                                        <input 
                                            className="input" 
                                            style={{ width: '100%' }}
                                            placeholder="Post title..."
                                            value={postForm.title}
                                            onChange={e => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                                        />
                                    </div>

                                    {/* Subtitle */}
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Subtitle</label>
                                        <input 
                                            className="input" 
                                            style={{ width: '100%' }}
                                            placeholder="Optional subtitle..."
                                            value={postForm.subtitle}
                                            onChange={e => setPostForm(prev => ({ ...prev, subtitle: e.target.value }))}
                                        />
                                    </div>

                                    {/* Cover Image */}
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cover Image *</label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCoverUpload}
                                                disabled={postForm.isUploading}
                                                style={{ display: 'none' }}
                                                id="admin-cover-upload"
                                            />
                                            <label htmlFor="admin-cover-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                                {postForm.isUploading ? 'Uploading...' : 'Upload Image'}
                                            </label>
                                            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>OR</span>
                                            <input 
                                                className="input" 
                                                style={{ flex: 1 }}
                                                placeholder="Paste image URL..."
                                                value={postForm.cover_image_url}
                                                onChange={e => setPostForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                                            />
                                        </div>
                                        {postForm.cover_image_url && (
                                            <img src={postForm.cover_image_url} alt="Preview" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', marginTop: '10px' }} />
                                        )}
                                    </div>

                                    {/* Country Selection */}
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                            Target Country (Optional)
                                        </label>
                                        <select 
                                            className="input"
                                            style={{ width: '100%' }}
                                            value={postForm.country_code}
                                            onChange={e => setPostForm(prev => ({ ...prev, country_code: e.target.value }))}
                                        >
                                            <option value="">Global (All Countries)</option>
                                            <option value="US">United States</option>
                                            <option value="GB">United Kingdom</option>
                                            <option value="CA">Canada</option>
                                            <option value="AU">Australia</option>
                                            <option value="IN">India</option>
                                            <option value="DE">Germany</option>
                                            <option value="FR">France</option>
                                            <option value="JP">Japan</option>
                                            <option value="BR">Brazil</option>
                                            <option value="MX">Mexico</option>
                                            <option value="ES">Spain</option>
                                            <option value="IT">Italy</option>
                                            <option value="NL">Netherlands</option>
                                            <option value="SG">Singapore</option>
                                            <option value="AE">UAE</option>
                                        </select>
                                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                                            Select a country to show this post only to users from that country. Leave empty for global visibility.
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Tags</label>
                                        <input 
                                            className="input" 
                                            style={{ width: '100%' }}
                                            placeholder="Enter tags separated by commas (e.g. tech, news, featured)"
                                            value={postForm.tags}
                                            onChange={e => setPostForm(prev => ({ ...prev, tags: e.target.value }))}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Content *</label>
                                        <textarea 
                                            className="input" 
                                            style={{ width: '100%', minHeight: '200px', resize: 'vertical' }}
                                            placeholder="Write your post content here..."
                                            value={postForm.content}
                                            onChange={e => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button 
                                            onClick={handleCreatePost}
                                            disabled={postSubmitting || !postForm.title || !postForm.content || !postForm.cover_image_url}
                                            className="btn btn-primary"
                                            style={{ opacity: (postSubmitting || !postForm.title || !postForm.content || !postForm.cover_image_url) ? 0.6 : 1 }}
                                        >
                                            {postSubmitting ? 'Publishing...' : 'Publish Post'}
                                        </button>
                                        <button 
                                            onClick={() => setShowCreatePost(false)}
                                            className="btn btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                                        {['Title', 'Author', 'Tags', 'Country', 'Status', 'Likes', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPosts.map(post => (
                                        <tr key={post.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{post.title}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-muted)' }}>
                                                {post.users?.display_name || post.users?.username || (
                                                    <span style={{ fontStyle: 'italic', opacity: 0.6 }}>
                                                        {post.source_platform && post.source_platform !== 'user' ? post.source_platform : 'Unknown'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {normalizeTags(post).slice(0, 3).map(tag => (
                                                        <span key={tag.id} className="tag-chip" style={{ fontSize: '10px' }}>#{tag.name}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '12px' }}>{post.country_code || 'Global'}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700 }}>{post.status}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px' }}>❤️ {formatK(post.like_count)}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <Link href={`/post/${post.id}`} title="View" style={{ color: 'var(--color-muted)', display: 'inline-flex' }}><Eye size={14} /></Link>
                                                    <button 
                                                        title="Remove" 
                                                        onClick={() => handleMarkPostRemoved(post.id)} 
                                                        disabled={postRemovingId === post.id}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            cursor: postRemovingId === post.id ? 'wait' : 'pointer', 
                                                            color: '#DC2626', 
                                                            display: 'inline-flex',
                                                            opacity: postRemovingId === post.id ? 0.6 : 1,
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {postRemovingId === post.id ? (
                                                            <span style={{ fontSize: '10px', fontWeight: 600 }}>Removing...</span>
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
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
            case 'reports': {
                const REASON_LABELS: Record<string, string> = {
                    spam: 'Spam',
                    nudity_sexual: 'Nudity or sexual activity',
                    hate_speech: 'Hate speech or symbols',
                    harassment_bullying: 'Bullying or harassment',
                    violence: 'Violence or dangerous orgs',
                    false_information: 'False information',
                    intellectual_property: 'Intellectual property violation',
                    scam_fraud: 'Scam or fraud',
                    self_harm: 'Suicide or self-injury',
                    other: 'Other',
                };
                const pendingReportsFiltered = reports.filter(r => String(r.status ?? '').toUpperCase() === 'PENDING');
                const resolvedReportsFiltered = reports.filter(r => String(r.status ?? '').toUpperCase() !== 'PENDING');
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Reported Content Queue</h2>
                        {reports.length === 0 ? (
                            <p style={{ color: 'var(--color-muted)' }}>No reports found.</p>
                        ) : (
                            <>
                                {pendingReportsFiltered.length > 0 && (
                                    <div style={{ marginBottom: '28px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#DC2626' }}>
                                            Pending ({pendingReportsFiltered.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {pendingReportsFiltered.map((report, idx) => {
                                                const reasonKey = String(report.reason ?? '');
                                                const reasonLabel = REASON_LABELS[reasonKey] || reasonKey || String(report.type ?? 'Report');
                                                const isPending = reportActionPendingId === String(report.id);
                                                return (
                                                    <div key={String(report.id ?? idx)} data-testid={`report-item-${report.id}`} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '18px 20px', boxShadow: 'var(--shadow-card)', borderLeft: '4px solid #DC2626' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, background: '#FEE2E2', color: '#991B1B' }}>
                                                                        {reasonLabel}
                                                                    </span>
                                                                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                                                                        {report.content_type === 'POST' ? 'Post' : report.content_type || 'Content'}
                                                                    </span>
                                                                </div>
                                                                {report.resolution_note && (
                                                                    <p style={{ fontSize: '13px', color: 'var(--color-primary)', marginBottom: '6px', lineHeight: 1.5 }}>
                                                                        &ldquo;{String(report.resolution_note)}&rdquo;
                                                                    </p>
                                                                )}
                                                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-muted)' }}>
                                                                    {report.content_id && (
                                                                        <Link href={`/post/${report.content_id}`} style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                                                                            View Post
                                                                        </Link>
                                                                    )}
                                                                    {report.created_at && <span>{new Date(String(report.created_at)).toLocaleString()}</span>}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                                                <button
                                                                    data-testid={`report-resolve-${report.id}`}
                                                                    onClick={() => handleReportAction(String(report.id), 'resolve')}
                                                                    disabled={isPending}
                                                                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#D1FAE5', color: '#065F46', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
                                                                >
                                                                    {isPending ? 'Updating...' : 'Resolve'}
                                                                </button>
                                                                <button
                                                                    data-testid={`report-dismiss-${report.id}`}
                                                                    onClick={() => handleReportAction(String(report.id), 'dismiss')}
                                                                    disabled={isPending}
                                                                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-muted)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
                                                                >
                                                                    Dismiss
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {resolvedReportsFiltered.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-muted)' }}>
                                            Resolved / Dismissed ({resolvedReportsFiltered.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {resolvedReportsFiltered.map((report, idx) => {
                                                const reasonKey = String(report.reason ?? '');
                                                const reasonLabel = REASON_LABELS[reasonKey] || reasonKey || String(report.type ?? 'Report');
                                                const statusUpper = String(report.status ?? '').toUpperCase();
                                                return (
                                                    <div key={String(report.id ?? idx)} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '14px 18px', boxShadow: 'var(--shadow-card)', opacity: 0.7 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{reasonLabel}</span>
                                                            <span style={{
                                                                display: 'inline-flex', borderRadius: '999px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
                                                                background: statusUpper === 'RESOLVED' ? '#D1FAE5' : '#E5E7EB',
                                                                color: statusUpper === 'RESOLVED' ? '#065F46' : '#374151',
                                                            }}>
                                                                {statusUpper}
                                                            </span>
                                                            {report.created_at && <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: 'auto' }}>{new Date(String(report.created_at)).toLocaleString()}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            }
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
            case 'broadcasts':
                return (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Broadcast Messages</h2>
                        
                        {/* Create New Broadcast Form */}
                        <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: 'var(--shadow-card)' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Create New Broadcast</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-muted)' }}>Title</label>
                                    <input
                                        type="text"
                                        value={broadcastForm.title}
                                        onChange={e => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Broadcast title..."
                                        maxLength={200}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-muted)' }}>Message Type</label>
                                    <select
                                        value={broadcastForm.message_type}
                                        onChange={e => setBroadcastForm(prev => ({ ...prev, message_type: e.target.value as any }))}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px' }}
                                    >
                                        <option value="ANNOUNCEMENT">Announcement</option>
                                        <option value="OFFER">Special Offer</option>
                                        <option value="UPDATE">System Update</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-muted)' }}>Message</label>
                                <textarea
                                    value={broadcastForm.body}
                                    onChange={e => setBroadcastForm(prev => ({ ...prev, body: e.target.value }))}
                                    placeholder="Your broadcast message..."
                                    maxLength={5000}
                                    rows={4}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-muted)' }}>Priority</label>
                                    <select
                                        value={broadcastForm.priority}
                                        onChange={e => setBroadcastForm(prev => ({ ...prev, priority: e.target.value as any }))}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px' }}
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-muted)' }}>Schedule (optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={broadcastForm.scheduled_at}
                                        onChange={e => setBroadcastForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-muted)' }}>Expires (optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={broadcastForm.expires_at}
                                        onChange={e => setBroadcastForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCreateBroadcast}
                                disabled={broadcastSubmitting || !broadcastForm.title.trim() || !broadcastForm.body.trim()}
                                style={{ 
                                    background: broadcastSubmitting ? 'var(--color-muted)' : 'var(--color-primary)', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    padding: '10px 20px', 
                                    fontSize: '13px', 
                                    fontWeight: 600, 
                                    cursor: broadcastSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: (broadcastSubmitting || !broadcastForm.title.trim() || !broadcastForm.body.trim()) ? 0.6 : 1
                                }}
                            >
                                {broadcastSubmitting ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </div>

                        {/* Broadcast History */}
                        <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '15px', padding: '20px 20px 0', marginBottom: '16px' }}>Broadcast History</h3>
                            {broadcasts.length === 0 ? (
                                <p style={{ color: 'var(--color-muted)', padding: '20px' }}>No broadcasts sent yet.</p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                                                {['Title', 'Type', 'Priority', 'Deliveries', 'Status', 'Created', 'Actions'].map(h => (
                                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {broadcasts.map(broadcast => (
                                                <tr key={broadcast.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{broadcast.title}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                        <span style={{ 
                                                            background: broadcast.message_type === 'URGENT' ? '#FEE2E2' : 
                                                                       broadcast.message_type === 'OFFER' ? '#DBEAFE' : '#F3F4F6',
                                                            color: broadcast.message_type === 'URGENT' ? '#991B1B' : 
                                                                  broadcast.message_type === 'OFFER' ? '#1E40AF' : '#374151',
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600
                                                        }}>
                                                            {broadcast.message_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                        <span style={{ 
                                                            background: broadcast.priority === 'URGENT' ? '#FEE2E2' : 
                                                                       broadcast.priority === 'HIGH' ? '#FEF3C7' : 
                                                                       broadcast.priority === 'LOW' ? '#F3F4F6' : '#E0E7FF',
                                                            color: broadcast.priority === 'URGENT' ? '#991B1B' : 
                                                                  broadcast.priority === 'HIGH' ? '#92400E' : 
                                                                  broadcast.priority === 'LOW' ? '#374151' : '#3730A3',
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600
                                                        }}>
                                                            {broadcast.priority}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-muted)' }}>
                                                        {broadcast.delivery_stats?.count || 0} users
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                        <span style={{ 
                                                            background: broadcast.is_active ? '#DCFCE7' : '#F3F4F6',
                                                            color: broadcast.is_active ? '#166534' : '#6B7280',
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600
                                                        }}>
                                                            {broadcast.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-muted)' }}>
                                                        {new Date(broadcast.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <button
                                                            onClick={() => {/* TODO: Add toggle active functionality */}}
                                                            style={{ 
                                                                background: 'var(--color-surface)', 
                                                                border: '1px solid var(--color-border)', 
                                                                borderRadius: '4px', 
                                                                padding: '4px 8px', 
                                                                fontSize: '11px', 
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {broadcast.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
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
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '22px', color: 'white' }}>
                        Purseable
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
                    <Link 
                        href="/admin/coupons" 
                        className="admin-nav-item" 
                        style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Gift size={16} /> Coupons & Deals
                    </Link>
                    <Link 
                        href="/admin/policies" 
                        className="admin-nav-item" 
                        style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Shield size={16} /> Legal Policies
                    </Link>
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
