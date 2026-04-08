'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, UserPlus, Flame, CheckCircle, ChevronRight, CornerDownRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

export default function NotificationsPage() {
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const supabase = createClient();

    useEffect(() => {
        let subscription: ReturnType<typeof supabase.channel> | null = null;
        
        const fetchNotifications = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    actor:actor_id(id, username, display_name, avatar_url)
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[Notifications] Failed to fetch:', error);
            } else {
                setNotifs(data || []);
            }
            setLoading(false);
            
            // Subscribe to realtime notifications
            subscription = supabase
                .channel(`notifications:${session.user.id}`)
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
                    (payload: { new: { id: string } }) => {
                        console.log('[Notifications] New notification:', payload);
                        // Fetch the new notification with actor details
                        supabase
                            .from('notifications')
                            .select(`*, actor:actor_id(id, username, display_name, avatar_url)`)
                            .eq('id', payload.new.id)
                            .single()
                            .then(({ data }: { data: Notification | null }) => {
                                if (data) {
                                    setNotifs(prev => [data, ...prev]);
                                }
                            });
                    }
                )
                .subscribe();
        };

        fetchNotifications();
        
        return () => {
            subscription?.unsubscribe();
        };
    }, [supabase]);

    const unreadCount = notifs.filter(n => !n.is_read).length;
    const displayNotifs = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs;

    const markAllRead = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', session.user.id)
            .eq('is_read', false);

        if (!error) {
            setNotifs(notifs.map(n => ({ ...n, is_read: true })));
        }
    };

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifs(notifs.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'LIKE': return <Heart size={16} fill="var(--color-accent)" color="var(--color-accent)" />;
            case 'COMMENT': return <MessageCircle size={16} color="var(--color-accent-2)" />;
            case 'REPLY': return <CornerDownRight size={16} color="var(--color-accent-2)" />;
            case 'FOLLOW': return <UserPlus size={16} color="#059669" />;
            case 'TRENDING': return <Flame size={16} fill="var(--color-trending)" color="var(--color-trending)" />;
            default: return <CheckCircle size={16} color="var(--color-muted)" />;
        }
    };

    const getMessage = (n: Notification) => {
        switch (n.type) {
            case 'LIKE': return <span>liked your post <strong style={{ color: 'var(--color-primary)' }}>{n.post_title}</strong></span>;
            case 'COMMENT': return <span>commented on your post <strong style={{ color: 'var(--color-primary)' }}>{n.post_title}</strong>: "{n.content_snippet}"</span>;
            case 'REPLY': return <span>replied to your comment on <strong style={{ color: 'var(--color-primary)' }}>{n.post_title}</strong>: "{n.content_snippet}"</span>;
            case 'FOLLOW': return <span>started following you</span>;
            case 'TRENDING': return <span>Your post <strong style={{ color: 'var(--color-primary)' }}>{n.post_title}</strong> is trending! 🔥</span>;
            default: return <span>There is a new update.</span>;
        }
    };

    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '40px 24px' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
                            Notifications
                        </h1>
                        <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>
                            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}.
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="btn btn-ghost btn-sm">
                            <CheckCircle size={14} /> Mark all as read
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '2px', borderBottom: '2px solid var(--color-border)', marginBottom: '24px' }}>
                    {(['all', 'unread'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '10px 20px',
                                fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600,
                                color: filter === f ? 'var(--color-accent)' : 'var(--color-muted)',
                                borderBottom: `2px solid ${filter === f ? 'var(--color-accent)' : 'transparent'}`,
                                marginBottom: '-2px', transition: 'all 150ms', textTransform: 'capitalize',
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)' }}>
                        <div className="btn-spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }} />
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '16px' }}>Loading notifications...</p>
                    </div>
                ) : displayNotifs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {displayNotifs.map(notif => (
                            <Link key={notif.id} 
                                href={notif.type === 'FOLLOW' && notif.actor?.username ? `/u/${notif.actor.username}` : `/post/${notif.entity_id}`} 
                                style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: 'var(--color-surface)', borderRadius: '12px', padding: '16px 20px',
                                    display: 'flex', gap: '16px', alignItems: 'flex-start',
                                    boxShadow: 'var(--shadow-card)', transition: 'var(--transition-card)',
                                    border: !notif.is_read ? '1.5px solid rgba(233, 69, 96, 0.15)' : '1.5px solid transparent',
                                }}
                                    onClick={() => {
                                        if (!notif.is_read) {
                                            markAsRead(notif.id);
                                        }
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = '')}>

                                    <div style={{ position: 'relative' }}>
                                        <img src={notif.actor?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${notif.actor?.username || 'user'}`} 
                                            alt={notif.actor?.display_name || 'User'} 
                                            className="avatar" style={{ width: '44px', height: '44px' }} />
                                        <div style={{
                                            position: 'absolute', bottom: '-4px', right: '-4px', width: '24px', height: '24px',
                                            borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                            {getIcon(notif.type)}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, paddingRight: '20px' }}>
                                        <p style={{
                                            fontFamily: 'var(--font-ui)', fontSize: '14px', lineHeight: 1.5,
                                            color: !notif.is_read ? 'var(--color-primary)' : 'var(--color-muted)',
                                            fontWeight: !notif.is_read ? 600 : 400,
                                        }}>
                                            <strong style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                                                {notif.actor?.display_name || notif.actor?.username || 'Someone'}
                                            </strong>{' '}
                                            {getMessage(notif)}
                                        </p>
                                        <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px', display: 'block' }}>
                                            {new Date(notif.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {!notif.is_read && <div className="notif-dot" style={{ marginTop: '20px' }} />}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔕</div>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '16px' }}>
                            {filter === 'unread' ? "You're all caught up! No unread notifications." : "You don't have any notifications yet."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
