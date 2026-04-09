'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const supabase = createClient();

    // Verify we have a valid code
    useEffect(() => {
        if (!code) {
            setError('Invalid or expired reset link. Please request a new one.');
        }
    }, [code]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!code) {
            setError('Invalid or expired reset link');
            return;
        }

        setLoading(true);

        try {
            // Exchange the code for a session
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
                setError('This reset link has expired. Please request a new one.');
                setLoading(false);
                return;
            }

            // Update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                setError(updateError.message);
                setLoading(false);
                return;
            }

            setSuccess(true);
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-page-outer" style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
                        Password Updated!
                    </h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '15px', marginBottom: '24px' }}>
                        Your password has been successfully changed. Redirecting you to login...
                    </p>
                    <Link href="/login" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        Go to Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page-outer" style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <Link href="/" className="brand-wordmark" style={{ display: 'inline-block', marginBottom: '24px' }}>
                        Centsably
                    </Link>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>
                        Reset your password
                    </h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                        Enter your new password below
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
                        padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#DC2626',
                        fontFamily: 'var(--font-ui)',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                            New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                className="input" 
                                type={showPw ? 'text' : 'password'} 
                                placeholder="Min. 8 characters" 
                                required
                                minLength={8}
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                style={{ paddingRight: '44px' }} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPw(!showPw)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                            Confirm Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                className="input" 
                                type={showConfirmPw ? 'text' : 'password'} 
                                placeholder="Confirm your password" 
                                required
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)}
                                style={{ paddingRight: '44px' }} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowConfirmPw(!showConfirmPw)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
                            >
                                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary btn-lg" 
                        disabled={loading || !code}
                        style={{ opacity: (loading || !code) ? 0.5 : 1, marginTop: '8px' }}
                    >
                        {loading ? 'Updating...' : 'Reset Password'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-muted)', marginTop: '24px' }}>
                    Remember your password?{' '}
                    <Link href="/login" style={{ color: 'var(--color-accent-2)', fontWeight: 600 }}>Log in</Link>
                </p>
            </div>
        </div>
    );
}
