'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [dob, setDob] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [step, setStep] = useState<'form' | 'verify'>('form');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        let ip_address = '';
        let location = '';
        let income_level = 'Medium';
        let os_family = 'Unknown';
        let device_type = 'Desktop';

        // Detect OS and Device for targeting & basic income inference
        const ua = window.navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(ua)) {
            os_family = 'iOS';
            device_type = 'Mobile';
            income_level = 'High'; // Simple heuristic: Apple mobile users often grouped in higher tier
        } else if (/Android/.test(ua)) {
            os_family = 'Android';
            device_type = 'Mobile';
        } else if (/Mac OS X/.test(ua)) {
            os_family = 'macOS';
            income_level = 'High'; // Simple heuristic: Mac users
        } else if (/Windows/.test(ua)) {
            os_family = 'Windows';
        }

        try {
            // Fetch geo location to infer more precise demographics
            const ipRes = await fetch('https://ipinfo.io/json');
            const ipData = await ipRes.json();
            ip_address = ipData.ip;
            location = `${ipData.city || ''}, ${ipData.country || ''}`.trim();
            const zip = ipData.postal || '';

            // Zip & Country based heuristic for 'Very High' income targeting
            const highIncomeZips = ['90210', '10001', '94027', '10013', '10007', 'SW1X', 'W1J', '75008'];
            const highIncomeCountries = ['CH', 'NO', 'LU', 'SG', 'AE', 'MC', 'QA'];

            if (highIncomeZips.some(z => zip.startsWith(z)) || highIncomeCountries.includes(ipData.country)) {
                income_level = 'Very High';
            }
        } catch (err) {
            console.error('Could not fetch IP and Location', err);
        }

        // Calculate Age Range from DOB
        let age_range = 'Unknown';
        if (dob) {
            const dobDate = new Date(dob);
            const age = new Date().getFullYear() - dobDate.getFullYear();
            if (age < 13) {
                setError("You must be at least 13 years old to use purseable.");
                setLoading(false);
                return;
            }
            if (age >= 13 && age <= 17) age_range = '13-17';
            else if (age >= 18 && age <= 24) age_range = '18-24';
            else if (age >= 25 && age <= 34) age_range = '25-34';
            else if (age >= 35 && age <= 44) age_range = '35-44';
            else if (age >= 45 && age <= 54) age_range = '45-54';
            else if (age >= 55 && age <= 64) age_range = '55-64';
            else if (age >= 65) age_range = '65+';
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    ip_address,
                    location,
                    dob,
                    age_range,
                    income_level,
                    os_family,
                    device_type
                }
            }
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setStep('verify');
        }
    };

    if (step === 'verify') {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>📬</div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
                        Check your inbox
                    </h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
                        We sent a verification link to <strong style={{ color: 'var(--color-primary)' }}>{email}</strong>.
                        Click the link to activate your account.
                    </p>
                    <Link href="/onboarding" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
                        I've verified — Continue →
                    </Link>
                    <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-muted)' }}>
                        Didn't receive it?{' '}
                        <button style={{ background: 'none', border: 'none', color: 'var(--color-accent-2)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                            Resend email
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex' }}>
            {/* Left pane — form */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <Link href="/" className="brand-wordmark" style={{ display: 'block', marginBottom: '36px' }}>
                        Ink<span>board</span>
                    </Link>

                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                        Create your account
                    </h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '28px' }}>
                        Join Europe's home for long-form writing.
                    </p>

                    {/* OAuth Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, gap: '8px', fontSize: '13px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
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
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email address</label>
                            <input className="input" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Date of Birth</label>
                            <input className="input" type="date" required value={dob} onChange={e => setDob(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input className="input" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" required
                                    minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                                    style={{ paddingRight: '44px' }} />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '4px', opacity: loading ? 0.7 : 1 }} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Account'}
                        </button>

                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                            By creating an account you agree to our{' '}
                            <Link href="/terms" style={{ color: 'var(--color-accent-2)' }}>Terms of Service</Link>
                            {' '}and{' '}
                            <Link href="/privacy" style={{ color: 'var(--color-accent-2)' }}>Privacy Policy</Link>. 🇪🇺 GDPR compliant.
                        </p>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-muted)', marginTop: '24px' }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: 'var(--color-accent-2)', fontWeight: 600 }}>Log in</Link>
                    </p>
                </div>
            </div>

            {/* Right pane — illustration */}
            <div className="show-desktop" style={{
                flex: 1,
                background: 'linear-gradient(135deg, #1A1A2E 0%, #0F3460 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '48px', textAlign: 'center', flexDirection: 'column', gap: '28px',
                }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '36px', color: 'white', fontWeight: 800, lineHeight: 1.2 }}>
                        "The best stories<br />find you when you're<br />ready to listen."
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)' }}>
                        — 12,000+ writers on purseable
                    </div>
                </div>
            </div>
        </div>
    );
}
