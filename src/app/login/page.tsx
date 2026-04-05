'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [adminStatus, setAdminStatus] = useState({
        loading: true,
        hasAdmin: true,
        setupLinkActive: false,
        expiresAt: null as string | null,
        linkToken: null as string | null,
        linkUrl: null as string | null,
        generating: false,
        error: null as string | null,
    });
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/admin/status', { cache: 'no-store' });
                if (!res.ok) throw new Error('Failed to load admin status');
                const data = await res.json();
                setAdminStatus(prev => ({
                    ...prev,
                    loading: false,
                    hasAdmin: data.hasAdmin,
                    setupLinkActive: data.setupLinkActive,
                    expiresAt: data.expiresAt ?? null,
                }));
            } catch (err: any) {
                setAdminStatus(prev => ({
                    ...prev,
                    loading: false,
                    error: err?.message || 'Unable to load admin status',
                }));
            }
        };
        fetchStatus();
    }, []);

    const handleGenerateAdminLink = async () => {
        setAdminStatus(prev => ({ ...prev, generating: true, error: null }));
        try {
            const res = await fetch('/api/admin/setup-link', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to create setup link');
            }

            const linkUrl = typeof window !== 'undefined' ? `${window.location.origin}/admin/setup?token=${data.token}` : null;

            setAdminStatus(prev => ({
                ...prev,
                hasAdmin: false,
                setupLinkActive: true,
                expiresAt: data.expiresAt ?? null,
                linkToken: data.token,
                linkUrl,
                generating: false,
            }));
        } catch (err: any) {
            setAdminStatus(prev => ({
                ...prev,
                generating: false,
                error: err?.message || 'Failed to create setup link',
            }));
        }
    };

    const showAdminSetup = !adminStatus.loading && !adminStatus.hasAdmin;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAttempts(a => a + 1);
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/');
            router.refresh();
        }
    };

    const locked = attempts >= 5;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <Link href="/" className="brand-wordmark" style={{ display: 'inline-block', marginBottom: '24px' }}>
                        Purseable
                    </Link>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>
                        Welcome back
                    </h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                        Sign in to your account
                    </p>
                </div>

                {locked && (
                    <div style={{
                        background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
                        padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#DC2626',
                        fontFamily: 'var(--font-ui)',
                    }}>
                        ⚠️ Too many attempts. Please wait 15 minutes before trying again.
                    </div>
                )}

                {error && (
                    <div style={{
                        background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
                        padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#DC2626',
                        fontFamily: 'var(--font-ui)',
                    }}>
                        {error}
                    </div>
                )}

                {/* Google OAuth */}
                <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '20px', gap: '10px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                </div>

                {!showForgot ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email</label>
                            <input className="input" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={locked} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
                                <button type="button" onClick={() => setShowForgot(true)}
                                    style={{ fontSize: '12px', color: 'var(--color-accent-2)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                    Forgot password?
                                </button>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input className="input" type={showPw ? 'text' : 'password'} placeholder="Your password" required
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    style={{ paddingRight: '44px' }} disabled={locked} />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" id="remember" style={{ width: '15px', height: '15px', accentColor: 'var(--color-accent-2)' }} />
                            <label htmlFor="remember" style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Remember this device</label>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={locked || loading} style={{ opacity: (locked || loading) ? 0.5 : 1 }}>
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                    </form>
                ) : (
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                            Reset your password
                        </h2>
                        {forgotSent ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
                                <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
                                    Check your inbox for a reset link.
                                </p>
                            </div>
                        ) : (
                            <>
                                <input className="input" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: '14px' }} />
                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setForgotSent(true)}>
                                    Send Reset Link
                                </button>
                            </>
                        )}
                        <button onClick={() => setShowForgot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent-2)', fontSize: '13px', marginTop: '16px', display: 'block' }}>
                            ← Back to login
                        </button>
                    </div>
                )}

                <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-muted)', marginTop: '24px' }}>
                    Don't have an account?{' '}
                    <Link href="/register" style={{ color: 'var(--color-accent-2)', fontWeight: 600 }}>Sign up free</Link>
                </p>

                {showAdminSetup && (
                    <div style={{ marginTop: '32px', padding: '18px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-ui)' }}>Set up the first admin</h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '12px' }}>
                            No admin account exists yet. Generate a one-time setup link to create the first administrator. The link expires after 15 minutes or immediately once the admin is created.
                        </p>
                        {adminStatus.linkUrl ? (
                            <div>
                                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', padding: '8px', background: 'var(--color-bg)', borderRadius: '8px', marginBottom: '8px' }}>
                                    {adminStatus.linkUrl}
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '12px' }}>
                                    Share securely with the person who will become the admin. Expires {adminStatus.expiresAt ? new Date(adminStatus.expiresAt).toLocaleString() : 'soon'}.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        if (!adminStatus.linkUrl) return;
                                        navigator.clipboard?.writeText(adminStatus.linkUrl);
                                    }}
                                    style={{ width: '100%' }}
                                >
                                    Copy setup link
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleGenerateAdminLink}
                                disabled={adminStatus.generating}
                                style={{ width: '100%', opacity: adminStatus.generating ? 0.6 : 1 }}
                            >
                                {adminStatus.generating ? 'Preparing link…' : 'Generate admin setup link'}
                            </button>
                        )}
                        {adminStatus.error && (
                            <p style={{ marginTop: '10px', fontSize: '12px', color: '#DC2626' }}>{adminStatus.error}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
