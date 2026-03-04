'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, PenSquare, LogOut } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';
import { createPortal } from 'react-dom';

const TOPICS = [
    'For You', 'Tech', 'Design', 'Science', 'Fashion', 'Travel',
    'Food', 'Art', 'Culture', 'Health', 'Business', 'Sports', 'AI', 'Startups'
];

// Simulated auth state
const DEMO_USER = {
    id: 'u3',
    username: 'elise_page',
    display_name: 'Élise Dupont',
    avatar_url: 'https://i.pravatar.cc/150?img=25',
};

export function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifOpen, setNotifOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [profileMenuPos, setProfileMenuPos] = useState<{ top: number; right: number } | null>(null);
    const supabase = createClient();
    const profileMenuRef = useRef<HTMLDivElement | null>(null);
    const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
    const profileMenuElRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
            setUserEmail(session?.user?.email || null);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: any, session: any) => {
                setIsLoggedIn(!!session);
                setUserEmail(session?.user?.email || null);
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;

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
                                            {MOCK_NOTIFICATIONS.map(n => (
                                                <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                                                    <img src={n.actor.avatar_url} alt={n.actor.display_name} className="avatar" style={{ width: '36px', height: '36px' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                                            <strong>{n.actor.display_name}</strong>
                                                            {n.type === 'LIKE' && ` liked your post`}
                                                            {n.type === 'COMMENT' && ` commented on your post`}
                                                            {n.type === 'REPLY' && ` replied to your comment`}
                                                            {n.type === 'FOLLOW' && ` followed you`}
                                                            {n.type === 'TRENDING' && `'s post is trending`}
                                                            {n.post_title && <span style={{ color: 'var(--color-muted)' }}> "{n.post_title.slice(0, 40)}…"</span>}
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '3px' }}>
                                                            {new Date(n.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    {!n.is_read && <div className="notif-dot" />}
                                                </div>
                                            ))}
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
                                    <img src={DEMO_USER.avatar_url} alt={DEMO_USER.display_name} className="avatar" />
                                    <div className="profile-meta hide-mobile">
                                        <span>{DEMO_USER.display_name}</span>
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
                                            <Link href="/ads" onClick={() => setProfileMenuOpen(false)}>Ads Center</Link>
                                            <Link href="/settings" onClick={() => setProfileMenuOpen(false)}>Settings</Link>
                                            <button className="profile-menu-logout" onClick={async () => { await supabase.auth.signOut(); setProfileMenuOpen(false); }}>
                                                <LogOut size={14} /> Sign out
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

