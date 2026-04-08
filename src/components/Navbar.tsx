'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, PenSquare, LogOut, Shield } from 'lucide-react';
import {
    createClient,
    resetClient,
    cacheUserProfile,
    getCachedUserProfile,
    clearCachedUserProfile,
    type CachedProfile,
} from '@/lib/supabase/client';
import { createPortal } from 'react-dom';

const TOPICS = [
    'For You', 'Tech', 'Design', 'Science', 'Fashion', 'Travel',
    'Food', 'Art', 'Culture', 'Health', 'Business', 'Sports', 'AI', 'Startups'
];

type NavNotification = {
    id: string;
    type?: string;
    is_read?: boolean;
    created_at?: string;
    post_title?: string;
    actor_display_name?: string;
    actor_avatar_url?: string;
};

interface NavbarProps {
    initialSession: any;
}

export function Navbar({ initialSession }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();

    // ── Auth state ───────────────────────────────────────────────────────
    // If we have initialSession, build an immediate profile so the navbar
    // renders logged-in UI on the very first paint — no waiting for Supabase.
    const hasSession = !!initialSession?.user;
    const meta = initialSession?.user?.user_metadata;

    // Build an instant profile from the session (OAuth metadata or fallback)
    const instantProfile = hasSession ? {
        display_name: meta?.full_name || meta?.name || meta?.display_name || initialSession.user.email?.split('@')[0] || 'User',
        avatar_url: meta?.avatar_url || meta?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${initialSession.user.email || 'user'}`,
        role: 'USER' as string,
        is_business: false,
    } : null;

    // Always start ready — we have either initialSession data or know user is logged out
    const [authReady, setAuthReady] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(hasSession);
    const [userEmail, setUserEmail] = useState<string | null>(
        initialSession?.user?.email || null
    );
    const [currentUser, setCurrentUser] = useState<{
        display_name: string;
        avatar_url: string;
        role: string;
        is_business: boolean;
    } | null>(instantProfile);

    const [searchQuery, setSearchQuery] = useState('');
    const [notifOpen, setNotifOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [profileMenuPos, setProfileMenuPos] = useState<{ top: number; right: number } | null>(null);
    const [notifications, setNotifications] = useState<NavNotification[]>([]);

    const profileMenuRef = useRef<HTMLDivElement | null>(null);
    const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
    const profileMenuElRef = useRef<HTMLDivElement | null>(null);
    const hydratedRef = useRef(false);

    const isAdmin = currentUser?.role === 'ADMIN';
    const isBusiness = Boolean(currentUser?.is_business);

    // ── Fetch profile from DB and cache it ─────────────────────────────
    const hydrateUser = useCallback(async (userId: string, email: string | null) => {
        if (!userId) return;
        const supabase = createClient();

        try {
            const { data, error } = await supabase
                .from('users')
                .select('display_name, avatar_url, role, is_business')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('[Navbar] Profile fetch error:', error.message);
                return;
            }

            if (!data) {
                // No profile in DB — try sync once
                try {
                    const syncRes = await fetch('/api/users/sync', { method: 'POST' });
                    if (syncRes.ok) {
                        const { data: retryData } = await supabase
                            .from('users')
                            .select('display_name, avatar_url, role, is_business')
                            .eq('id', userId)
                            .maybeSingle();
                        if (retryData) {
                            applyProfile(retryData, userId, email);
                            return;
                        }
                    }
                } catch { /* sync failed, continue with fallback */ }

                // Fallback profile
                applyProfile({
                    display_name: 'Purseable User',
                    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${email || 'user'}`,
                    role: 'USER',
                    is_business: false,
                }, userId, email);
                return;
            }

            applyProfile(data, userId, email);
        } catch (err) {
            console.error('[Navbar] hydrateUser failed:', err);
        }
    }, []);

    const applyProfile = (
        profile: { display_name: string; avatar_url: string; role: string; is_business: boolean },
        userId: string,
        email: string | null,
    ) => {
        setCurrentUser({
            display_name: profile.display_name || 'Purseable User',
            avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${email || 'user'}`,
            role: profile.role || 'USER',
            is_business: Boolean(profile.is_business),
        });
        cacheUserProfile({
            id: userId,
            display_name: profile.display_name || 'Purseable User',
            avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${email || 'user'}`,
            role: profile.role || 'USER',
            is_business: Boolean(profile.is_business),
            email,
        });
    };

    // ── Load notifications ─────────────────────────────────────────────
    const loadNotifications = useCallback(async (userId: string) => {
        if (!userId) { setNotifications([]); return; }
        const supabase = createClient();

        const { data, error } = await supabase
            .from('notifications')
            .select(`*, actor:actor_id(display_name, avatar_url, username)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('[Navbar] Failed to load notifications:', error);
            return;
        }

        setNotifications((data ?? []).map((n: any) => ({
            id: n.id,
            type: n.type,
            is_read: n.is_read,
            created_at: n.created_at,
            post_title: n.post_title,
            actor_display_name: n.actor?.display_name || n.actor?.username || 'Someone',
            actor_avatar_url: n.actor?.avatar_url,
        })));
    }, []);

    // ── Main auth effect: wait for session, then load everything ───────
    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        // Read cache on the client (safe here — inside useEffect, after hydration)
        const cached = getCachedUserProfile();

        if (cached && hasSession) {
            // Cache hit — show profile instantly, refresh in background
            setCurrentUser({
                display_name: cached.display_name,
                avatar_url: cached.avatar_url,
                role: cached.role,
                is_business: cached.is_business,
            });
            setUserEmail(cached.email || initialSession?.user?.email || null);
            setAuthReady(true);
            // Background refresh
            hydrateUser(initialSession.user.id, initialSession.user.email || null);
            loadNotifications(initialSession.user.id);
        } else if (hasSession) {
            // No cache — fetch profile, then mark ready
            hydrateUser(initialSession.user.id, initialSession.user.email || null).then(() => {
                if (!cancelled) setAuthReady(true);
            });
            loadNotifications(initialSession.user.id);
        }

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: any, session: any) => {
                if (cancelled) return;

                // If we already have a server session, ignore any null events
                // from the client bootstrap — only trust explicit SIGNED_OUT
                if (!session && hasSession && _event !== 'SIGNED_OUT') return;

                if (session?.user) {
                    setIsLoggedIn(true);
                    setUserEmail(session.user.email || null);
                    // Immediately show a profile from session metadata so the
                    // navbar renders logged-in UI without waiting for the DB call
                    if (!currentUser) {
                        const m = session.user.user_metadata || {};
                        setCurrentUser({
                            display_name: m.full_name || m.name || m.display_name || session.user.email?.split('@')[0] || 'User',
                            avatar_url: m.avatar_url || m.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${session.user.email || 'user'}`,
                            role: 'USER',
                            is_business: false,
                        });
                    }
                    if (!hydratedRef.current || _event === 'SIGNED_IN') {
                        hydratedRef.current = true;
                        hydrateUser(session.user.id, session.user.email || null);
                        loadNotifications(session.user.id);
                    }
                } else if (_event === 'SIGNED_OUT') {
                    setIsLoggedIn(false);
                    setUserEmail(null);
                    setCurrentUser(null);
                    setNotifications([]);
                    clearCachedUserProfile();
                    if (!cancelled) setAuthReady(true);
                }
            }
        );

        // Safety: if nothing has resolved authReady in 4 seconds and we have
        // initialSession, force-show with whatever we have
        const safety = setTimeout(() => {
            if (!cancelled) setAuthReady(true);
        }, 4000);

        return () => {
            cancelled = true;
            clearTimeout(safety);
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAllNotificationsRead = async () => {
        const userId = initialSession?.user?.id || getCachedUserProfile()?.id;
        if (!userId) return;
        const supabase = createClient();

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    // ── Scroll listener ────────────────────────────────────────────────
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // ── Click-outside for profile menu ─────────────────────────────────
    useEffect(() => {
        if (!profileMenuOpen) return;
        const handleClick = (event: MouseEvent) => {
            const targetNode = event.target as Node;
            const clickedTrigger = !!profileTriggerRef.current && profileTriggerRef.current.contains(targetNode);
            const clickedMenu = !!profileMenuElRef.current && profileMenuElRef.current.contains(targetNode);
            if (!clickedTrigger && !clickedMenu) setProfileMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [profileMenuOpen]);

    // ── Profile menu positioning ───────────────────────────────────────
    useEffect(() => {
        if (!profileMenuOpen) {
            setProfileMenuPos(null);
            return;
        }

        const updatePos = () => {
            if (!profileTriggerRef.current) return;
            const rect = profileTriggerRef.current.getBoundingClientRect();
            const top = rect.bottom + 8;
            const right = Math.max(12, window.innerWidth - rect.right);
            setProfileMenuPos({ top, right });
        };

        updatePos();
        window.addEventListener('resize', updatePos);
        window.addEventListener('scroll', updatePos, { passive: true });
        return () => {
            window.removeEventListener('resize', updatePos);
            window.removeEventListener('scroll', updatePos);
        };
    }, [profileMenuOpen]);

    // ── Handlers ───────────────────────────────────────────────────────
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    };

    const handleSignOut = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            const supabase = createClient();
            // signOut can hang indefinitely on GoTrueClient auth lock — race with timeout
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
            // createClient or other unexpected error — proceed with forced cleanup
        }
        // Always force-clear everything regardless of signOut result
        setProfileMenuOpen(false);
        localStorage.removeItem('purseable:last-admin-view');
        clearCachedUserProfile();
        // Clear all supabase cookies
        document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.split('=');
            const t = name.trim();
            if (t.includes('supabase') || t.includes('sb-')) {
                document.cookie = `${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
        });
        sessionStorage.clear();
        resetClient();
        window.location.replace('/login');
    };

    // ── Render helpers ─────────────────────────────────────────────────
    const renderSearchForm = (extraClass: string) => (
        <form onSubmit={handleSearch} className={`navbar-search ${extraClass}`} style={{ position: 'relative' }}>
            <Search
                size={15}
                style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--color-muted)',
                }}
            />
            <input
                className="input"
                style={{ paddingLeft: '36px', background: 'var(--color-surface)', borderRadius: '24px', fontSize: '14px' }}
                placeholder="Search posts, authors, tags…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
        </form>
    );

    if (pathname.startsWith('/admin')) {
        return null;
    }

    // ── Don't render auth-dependent UI until auth is ready ─────────────
    const showLoggedIn = authReady && isLoggedIn && currentUser;
    const showLoggedOut = authReady && !isLoggedIn;

    return (
        <header className={`navbar-shell ${scrolled ? 'navbar-scrolled' : ''}`}>
            <div className="navbar-inner">
                <Link href="/" className="navbar-brand" aria-label="purseable home" style={{ flexShrink: 0, marginRight: '80px' }}>
                    <img src="/transparent-image.png" alt="Purseable" style={{ height: '56px', width: 'auto', display: 'block' }} />
                </Link>

                {renderSearchForm('desktop-only')}

                <div className="navbar-actions">
                    {!authReady ? (
                        /* Show nothing until auth settles — just a small placeholder */
                        <div style={{ width: '36px', height: '36px' }} />
                    ) : showLoggedIn ? (
                        <>
                            {isAdmin && (
                                <Link href="/admin" className="btn btn-secondary btn-sm hide-mobile">
                                    <Shield size={14} /> Admin Console
                                </Link>
                            )}

                            <Link href="/compose" className="btn btn-primary btn-sm hide-mobile">
                                <PenSquare size={14} /> Write
                            </Link>

                            <div className="notif-trigger">
                                <button
                                    onClick={() => setNotifOpen(!notifOpen)}
                                    className="btn btn-ghost btn-sm"
                                    aria-label="Notifications"
                                >
                                    <Bell size={18} />
                                    {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                                </button>

                                {notifOpen && <div className="overlay" onClick={() => setNotifOpen(false)} />}

                                {notifOpen && (
                                    <div className="notif-panel">
                                        <div className="notif-panel-header">
                                            <span>Notifications</span>
                                            {unreadCount > 0 && (
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={markAllNotificationsRead}
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="notif-panel-body">
                                            {notifications.map(n => (
                                                <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                                                    <img src={n.actor_avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&q=80'} alt={n.actor_display_name || 'User'} className="avatar" style={{ width: '36px', height: '36px' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                                            <strong>{n.actor_display_name || 'Someone'}</strong>
                                                            {n.type === 'LIKE' && ` liked your post`}
                                                            {n.type === 'COMMENT' && ` commented on your post`}
                                                            {n.type === 'REPLY' && ` replied to your comment`}
                                                            {n.type === 'FOLLOW' && ` followed you`}
                                                            {n.type === 'TRENDING' && `'s post is trending`}
                                                            {n.post_title && <span style={{ color: 'var(--color-muted)' }}> "{n.post_title.slice(0, 40)}…"</span>}
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '3px' }}>
                                                            {n.created_at
                                                                ? new Date(n.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                : 'Just now'}
                                                        </p>
                                                    </div>
                                                    {!n.is_read && <div className="notif-dot" />}
                                                </div>
                                            ))}
                                            {notifications.length === 0 && (
                                                <p style={{ fontSize: '13px', color: 'var(--color-muted)', padding: '10px' }}>No notifications yet.</p>
                                            )}
                                        </div>
                                        <div className="notif-panel-footer">
                                            <Link href="/notifications">See all notifications</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="navbar-profile" ref={profileMenuRef}>
                                <button
                                    ref={profileTriggerRef}
                                    type="button"
                                    className="profile-trigger"
                                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                >
                                    <img src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userEmail || 'user'}`} alt={currentUser?.display_name || 'User'} className="avatar" />
                                    <div className="profile-meta hide-mobile">
                                        <span>{currentUser?.display_name || 'User'}</span>
                                        <small>{userEmail}</small>
                                    </div>
                                </button>
                                {profileMenuOpen && typeof document !== 'undefined' && profileMenuPos && createPortal(
                                    <>
                                        <div className="profile-menu-overlay" onClick={() => setProfileMenuOpen(false)} />
                                        <div
                                            ref={profileMenuElRef}
                                            className="profile-menu"
                                            style={{ position: 'fixed', top: profileMenuPos.top, right: profileMenuPos.right }}
                                        >
                                            <Link href="/profile" onClick={() => setProfileMenuOpen(false)}>My profile</Link>
                                            <Link href="/messages" onClick={() => setProfileMenuOpen(false)}>Messages</Link>
                                            <Link href="/notifications" onClick={() => setProfileMenuOpen(false)}>Notifications</Link>
                                            {isBusiness && <Link href="/ads" onClick={() => setProfileMenuOpen(false)}>Ads Center</Link>}
                                            {!isBusiness && (
                                                <Link href="/business/request" onClick={() => setProfileMenuOpen(false)}>
                                                    Become a business partner
                                                </Link>
                                            )}
                                            {isAdmin && <Link href="/admin" onClick={() => setProfileMenuOpen(false)}><Shield size={14} style={{ marginRight: 6 }} />Admin Console</Link>}
                                            <Link href="/settings" onClick={() => setProfileMenuOpen(false)}>Settings</Link>
                                            <button
                                                className="profile-menu-logout"
                                                disabled={loggingOut}
                                                onClick={handleSignOut}
                                            >
                                                {loggingOut ? (
                                                    <span className="btn-spinner" aria-hidden="true" />
                                                ) : (
                                                    <LogOut size={14} />
                                                )}
                                                {loggingOut ? 'Signing out…' : 'Sign out'}
                                            </button>
                                        </div>
                                    </>
                                    , document.body
                                )}
                            </div>
                        </>
                    ) : showLoggedOut ? (
                        <>
                            <Link href="/login" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                                Log in
                            </Link>
                            <Link href="/register" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                                Sign up
                            </Link>
                        </>
                    ) : (
                        /* Waiting for auth — empty placeholder */
                        <div style={{ width: '36px', height: '36px' }} />
                    )}
                </div>
            </div>

            {renderSearchForm('mobile-only')}
        </header>
    );
}
