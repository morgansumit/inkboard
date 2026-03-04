'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, PenSquare, LogOut } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifOpen, setNotifOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const supabase = createClient();

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    };

    return (
        <nav className="navbar" style={{
            position: 'sticky', top: 0, zIndex: 40,
            background: 'rgba(247,245,242,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--color-border)',
            padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '16px'
        }}>
            <nav style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '0 24px', height: '64px', maxWidth: '1600px', margin: '0 auto',
            }}>
                {/* Search */}
                <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '560px', position: 'relative' }}>
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

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    {isLoggedIn ? (
                        <>
                            {/* Write CTA */}
                            <Link href="/compose" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <PenSquare size={14} /> Write
                            </Link>

                            {/* Notifications */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setNotifOpen(!notifOpen)}
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '8px', borderRadius: '50%' }}
                                    aria-label="Notifications"
                                >
                                    <Bell size={18} />
                                    {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                                </button>

                                {notifOpen && (
                                    <div onClick={() => setNotifOpen(false)}
                                        style={{
                                            position: 'fixed', inset: 0, zIndex: 45,
                                        }}>
                                    </div>
                                )}

                                {notifOpen && (
                                    <div style={{
                                        position: 'absolute', right: 0, top: '48px',
                                        width: '360px', background: 'var(--color-surface)',
                                        borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                                        border: '1px solid var(--color-border)', zIndex: 50, overflow: 'hidden',
                                    }}>
                                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, fontFamily: 'var(--font-ui)', fontSize: '14px' }}>Notifications</span>
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px', padding: '4px 8px' }}>Mark all read</button>
                                        </div>
                                        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
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
                                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                                            <Link href="/notifications" style={{ fontSize: '13px', color: 'var(--color-accent-2)', fontWeight: 600 }}>
                                                See all notifications
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Avatar / Profile */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-primary)' }}>
                                    {userEmail}
                                </div>
                                <Link href={`/u/${DEMO_USER.username}`}>
                                    <img src={DEMO_USER.avatar_url} alt={DEMO_USER.display_name} className="avatar"
                                        style={{ width: '36px', height: '36px', border: '2px solid var(--color-border)', cursor: 'pointer' }} />
                                </Link>
                                <button className="btn btn-ghost btn-sm"
                                    onClick={async () => await supabase.auth.signOut()}
                                    style={{ padding: '8px', borderRadius: '50%' }} aria-label="Sign out">
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link href="/compose" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <PenSquare size={14} /> Write
                            </Link>
                            <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
                            <Link href="/register" className="btn btn-primary btn-sm hide-mobile">
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Topics Bar */}
            <div style={{
                display: 'flex', overflowX: 'auto', gap: '8px', padding: '12px 24px',
                borderTop: '1px solid var(--color-border)',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE/Edge
            }} className="hide-scroll">
                {TOPICS.map(topic => (
                    <Link
                        key={topic}
                        href={topic === 'For You' ? '/' : `/?topic=${encodeURIComponent(topic)}`}
                        style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '24px',
                            padding: '6px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            whiteSpace: 'nowrap',
                            textDecoration: 'none',
                            transition: 'all 200ms',
                        }}
                    >
                        {topic}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
