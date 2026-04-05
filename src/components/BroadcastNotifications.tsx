'use client';

import { useEffect, useState } from 'react';
import { X, Megaphone, AlertCircle, Gift, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Broadcast = {
    id: string;
    title: string;
    body: string;
    message_type: 'ANNOUNCEMENT' | 'OFFER' | 'UPDATE' | 'URGENT';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    scheduled_at: string;
    expires_at?: string | null;
    created_at: string;
    delivered_at: string;
    read_at?: string | null;
    dismissed_at?: string | null;
};

export function BroadcastNotifications() {
    const supabase = createClient();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBroadcasts = async () => {
            try {
                const res = await fetch('/api/broadcasts/my');
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Failed to fetch broadcasts');
                
                // Filter out read/dismissed broadcasts
                const activeBroadcasts = data.broadcasts?.filter((b: Broadcast) => 
                    !b.read_at && !b.dismissed_at
                ) || [];
                
                setBroadcasts(activeBroadcasts);
            } catch (err) {
                console.error('[broadcasts] Failed to fetch:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBroadcasts();
        
        // Poll for new broadcasts every 2 minutes
        const interval = setInterval(fetchBroadcasts, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleDismiss = async (broadcastId: string) => {
        try {
            await fetch('/api/broadcasts/my', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ broadcast_id: broadcastId, action: 'dismiss' }),
            });
            
            setBroadcasts(prev => prev.filter(b => b.id !== broadcastId));
        } catch (err) {
            console.error('[broadcasts] Failed to dismiss:', err);
        }
    };

    const handleMarkRead = async (broadcastId: string) => {
        try {
            await fetch('/api/broadcasts/my', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ broadcast_id: broadcastId, action: 'read' }),
            });
            
            setBroadcasts(prev => prev.filter(b => b.id !== broadcastId));
        } catch (err) {
            console.error('[broadcasts] Failed to mark as read:', err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'URGENT': return <AlertCircle size={16} />;
            case 'OFFER': return <Gift size={16} />;
            default: return <Megaphone size={16} />;
        }
    };

    const getStyles = (priority: string) => {
        switch (priority) {
            case 'URGENT':
                return {
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    iconBg: '#EF4444',
                };
            case 'HIGH':
                return {
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    color: '#92400E',
                    iconBg: '#F59E0B',
                };
            case 'LOW':
                return {
                    background: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    color: '#374151',
                    iconBg: '#6B7280',
                };
            default:
                return {
                    background: '#DBEAFE',
                    border: '1px solid #93C5FD',
                    color: '#1E40AF',
                    iconBg: '#3B82F6',
                };
        }
    };

    if (loading || broadcasts.length === 0) return null;

    return (
        <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 1000, maxWidth: '400px' }}>
            {broadcasts.map((broadcast, index) => {
                const styles = getStyles(broadcast.priority);
                return (
                    <div
                        key={broadcast.id}
                        style={{
                            ...styles,
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: index > 0 ? '12px' : '0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            animation: 'slideIn 0.3s ease-out',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{
                                background: styles.iconBg,
                                color: 'white',
                                borderRadius: '50%',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px',
                            }}>
                                {getIcon(broadcast.message_type)}
                            </div>
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: styles.color }}>
                                        {broadcast.title}
                                    </h4>
                                    <button
                                        onClick={() => handleDismiss(broadcast.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: styles.color,
                                            cursor: 'pointer',
                                            padding: '4px',
                                            borderRadius: '4px',
                                            opacity: 0.7,
                                            transition: 'opacity 0.2s',
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                
                                <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.4', color: styles.color }}>
                                    {broadcast.body}
                                </p>
                                
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', opacity: 0.7, color: styles.color }}>
                                        {new Date(broadcast.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={() => handleMarkRead(broadcast.id)}
                                        style={{
                                            background: 'none',
                                            border: '1px solid ' + styles.color,
                                            color: styles.color,
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = styles.color;
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'none';
                                            e.currentTarget.style.color = styles.color;
                                        }}
                                    >
                                        Got it
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            
            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
