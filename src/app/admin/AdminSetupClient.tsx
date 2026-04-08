'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminSetupClientProps {
    token: string;
    expiresAt: string;
}

export function AdminSetupClient({ token, expiresAt }: AdminSetupClientProps) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('centsably Admin');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, password, displayName }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to create admin');
            }
            setSuccess(true);
            setTimeout(() => router.replace('/admin'), 1200);
        } catch (err: any) {
            setError(err?.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{ width: '100%', maxWidth: '520px', background: 'var(--color-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-card)', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div className="brand-wordmark" style={{ display: 'inline-flex', fontSize: '28px', marginBottom: '10px' }}>
                        Ink<span>board</span>
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', marginBottom: '6px' }}>Create the first admin</h1>
                    <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Setup link expires at {new Date(expiresAt).toLocaleString()}.</p>
                </div>

                {error && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#B91C1C' }}>
                        {error}
                    </div>
                )}

                {success ? (
                    <div style={{ textAlign: 'center', padding: '32px 12px' }}>
                        <div style={{ fontSize: '42px', marginBottom: '12px' }}>✅</div>
                        <p style={{ fontSize: '15px', color: 'var(--color-primary)', fontWeight: 600 }}>Admin created! Redirecting…</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Admin email</label>
                            <input className="input" type="email" placeholder="admin@centsably.eu" required value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Display name</label>
                            <input className="input" type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Password</label>
                            <input className="input" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Confirm password</label>
                            <input className="input" type="password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '12px', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Creating…' : 'Create admin account'}
                        </button>
                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'center' }}>
                            This link can be used only once. Do not share publicly.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
