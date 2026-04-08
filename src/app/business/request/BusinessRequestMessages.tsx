'use client';

import { useCallback, useEffect, useState } from 'react';
import { FunLoader } from '@/components/FunLoader';

type BusinessMessage = {
    id: string;
    business_request_id: string;
    sender_user_id: string;
    sender_role: 'ADMIN' | 'USER';
    body: string;
    created_at: string;
    read_at?: string | null;
};

type Props = {
    businessRequestId: string;
};

type ApiResponse = {
    request?: {
        id: string;
        status?: string | null;
        business_name?: string | null;
        reviewer_note?: string | null;
    } | null;
    messages?: BusinessMessage[];
    error?: string;
};

export default function BusinessRequestMessages({ businessRequestId }: Props) {
    const [messages, setMessages] = useState<BusinessMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMessages = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
        if (!background) {
            setLoading(true);
        }

        try {
            const res = await fetch(`/api/business/request/messages?businessRequestId=${encodeURIComponent(businessRequestId)}`, {
                cache: 'no-store',
            });
            const data = (await res.json()) as ApiResponse;

            if (!res.ok) {
                throw new Error(data?.error || 'Failed to load messages');
            }

            setMessages(data.messages ?? []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        } finally {
            if (!background) {
                setLoading(false);
            }
        }
    }, [businessRequestId]);

    useEffect(() => {
        void loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            void loadMessages({ background: true });
        }, 4000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [loadMessages]);

    const handleSend = async () => {
        const message = draft.trim();
        if (!message) return;

        setSending(true);
        setError(null);

        try {
            const res = await fetch('/api/business/request/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessRequestId, message }),
            });
            const data = (await res.json()) as { message?: BusinessMessage; error?: string };

            if (!res.ok || !data.message) {
                throw new Error(data?.error || 'Failed to send message');
            }

            setMessages(prev => [...prev, data.message as BusinessMessage]);
            setDraft('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="business-request-form" style={{ marginTop: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Messages with centsably Ads</h3>
                    <p className="form-legal" style={{ marginTop: '4px' }}>
                        Ask questions, discuss offers, and receive approval follow-ups here.
                    </p>
                </div>
                {loading && <FunLoader size="sm" />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {!loading && messages.length === 0 && (
                    <div className="business-callout note">No messages yet. When the admin reaches out, the conversation will appear here.</div>
                )}
                {messages.map(message => {
                    const isAdminMessage = message.sender_role === 'ADMIN';
                    return (
                        <div key={message.id} style={{ alignSelf: isAdminMessage ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                            <div
                                style={{
                                    background: isAdminMessage ? '#111827' : '#E5E7EB',
                                    color: isAdminMessage ? '#F9FAFB' : '#111827',
                                    borderRadius: '12px',
                                    padding: '10px 12px',
                                    fontSize: '13px',
                                    lineHeight: 1.45,
                                }}
                            >
                                {message.body}
                            </div>
                            <div className="form-legal" style={{ marginTop: '4px', textAlign: isAdminMessage ? 'left' : 'right' }}>
                                {isAdminMessage ? 'centsably Admin' : 'You'} · {new Date(message.created_at).toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                    className="input business-textarea"
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    placeholder="Reply to the admin, ask about approval, or discuss ad offers…"
                    rows={3}
                    style={{ minHeight: '100px' }}
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ minWidth: '88px', height: '42px' }}
                >
                    {sending ? 'Sending…' : 'Send'}
                </button>
            </div>

            {error && <div className="business-callout error">{error}</div>}
        </div>
    );
}
