'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, PenSquare, LogOut, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<{ display_name: string; avatar_url: string; role: string; is_business: boolean } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifOpen, setNotifOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [profileMenuPos, setProfileMenuPos] = useState<{ top: number; right: number } | null>(null);
    const [notifications, setNotifications] = useState<NavNotification[]>([]);
    const supabase = createClient();
    const profileMenuRef = useRef<HTMLDivElement | null>(null);
    const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
    const profileMenuElRef = useRef<HTMLDivElement | null>(null);
    const isAdmin = currentUser?.role === 'ADMIN';
    const isBusiness = Boolean(currentUser?.is_business);

    useEffect(() => {
        const hydrateUser = async (userId: string | undefined) => {
            if (!userId) {
                setCurrentUser(null);
                return;
            }

            const fetchProfile = async () => {
                const { data } = await supabase
                    .from('users')
                    .select('display_name, avatar_url, role, is_business')
                    .eq('id', userId)
                    .maybeSingle();
                return data;
            };

            let profile = await fetchProfile();

            if (!profile) {
                try {
                    await fetch('/api/users/sync', { method: 'POST' });
                    profile = await fetchProfile();
                } catch (err) {
                    console.error('Failed to sync profile', err);
                }
            }

            setCurrentUser({
                display_name: profile?.display_name || 'Inkboard User',
                avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&q=80',
                role: profile?.role || 'USER',
                is_business: Boolean(profile?.is_business),
            });
        };

        const loadNotifications = async (userId: string | undefined) => {
            if (!userId) {
                setNotifications([]);
                return;
            }

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error) {
                setNotifications((data ?? []) as NavNotification[]);
            }
        };

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
            setUserEmail(session?.user?.email || null);
            await hydrateUser(session?.user?.id);
            await loadNotifications(session?.user?.id);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: any, session: any) => {
                setIsLoggedIn(!!session);
                setUserEmail(session?.user?.email || null);
                await hydrateUser(session?.user?.id);
                await loadNotifications(session?.user?.id);
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    };

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

    return (
        <header className={`navbar-shell ${scrolled ? 'navbar-scrolled' : ''}`}>
            <div className="navbar-inner">
                <Link href="/" className="navbar-brand" aria-label="Inkboard home">
                    <span>Inkboard</span>
                </Link>

                {renderSearchForm('desktop-only')}

                <div className="navbar-actions">
                    {isLoggedIn ? (
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
                                            <button className="btn btn-ghost btn-sm">Mark all read</button>
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
                                    <img src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&q=80'} alt={currentUser?.display_name || 'User'} className="avatar" />
                                    <div className="profile-meta hide-mobile">
                                        <span>{currentUser?.display_name || 'Inkboard User'}</span>
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
                                                onClick={async () => {
                                                    if (loggingOut) return;
                                                    try {
                                                        setLoggingOut(true);
                                                        const { error } = await supabase.auth.signOut();
                                                        if (error) throw error;
                                                        setProfileMenuOpen(false);
                                                        // Always redirect to login after sign out
                                                        router.push('/login');
                                                    } catch (err) {
                                                        console.error('[navbar] sign out failed', err);
                                                        setLoggingOut(false);
                                                    }
                                                }}
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
                    ) : (
                        <>
                            <Link href="/login" className="btn btn-secondary btn-sm">
                                Log in
                            </Link>
                            <Link href="/register" className="btn btn-primary btn-sm">
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {renderSearchForm('mobile-only')}
        </header>
    );
}

