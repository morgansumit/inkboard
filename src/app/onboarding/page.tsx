'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { MOCK_INTERESTS } from '@/lib/mockData';
import Link from 'next/link';

export default function OnboardingPage() {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [step, setStep] = useState<'interests' | 'profile'>('interests');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const canContinue = selected.size >= 3;

    const handleSaveProfile = async () => {
        if (saving) return;
        setSaving(true);
        setError('');

        try {
            // First ensure the user record exists via sync
            await fetch('/api/users/sync', { method: 'POST' });

            // Then update profile fields if any were provided
            const updates: Record<string, string> = {};
            if (username.trim()) updates.username = username.trim();
            if (displayName.trim()) updates.display_name = displayName.trim();
            if (bio.trim()) updates.bio = bio.trim();

            if (Object.keys(updates).length > 0) {
                const res = await fetch('/api/users/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates),
                });
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || 'Failed to save profile');
                    setSaving(false);
                    return;
                }
            }

            router.push('/');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (step === 'profile') {
        return (
            <div style={{
                minHeight: '100vh', background: 'var(--color-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
            }}>
                <div style={{ width: '100%', maxWidth: '480px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div className="brand-wordmark" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>
                            Ink<span>board</span>
                        </div>
                        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>
                            Complete your profile
                        </h1>
                        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                            This is optional — you can do it later in Settings.
                        </p>
                    </div>

                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={e => { e.preventDefault(); handleSaveProfile(); }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', display: 'block', marginBottom: '6px' }}>
                                Display Name
                            </label>
                            <input
                                className="input"
                                placeholder="e.g. Sofia Andersson"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value.slice(0, 50))}
                            />
                        </div>

                        <div>
                            <label style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', display: 'block', marginBottom: '6px' }}>
                                Username
                            </label>
                            <input
                                className="input"
                                placeholder="e.g. sofia_writes"
                                value={username}
                                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            />
                        </div>

                        <div>
                            <label style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', display: 'block', marginBottom: '6px' }}>
                                Bio <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(max 200 chars)</span>
                            </label>
                            <textarea
                                className="input"
                                placeholder="Tell readers who you are…"
                                value={bio}
                                onChange={e => setBio(e.target.value.slice(0, 200))}
                                rows={3}
                                style={{ resize: 'none', fontFamily: 'var(--font-ui)' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px', textAlign: 'right' }}>
                                {bio.length}/200
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ textAlign: 'center', marginTop: '8px', opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                        >
                            {saving ? 'Saving...' : '🎉 Enter centsably'}
                        </button>
                        <Link href="/" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)', textDecoration: 'none' }}>
                            Skip for now
                        </Link>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--color-bg)', padding: '48px 20px 80px',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div className="brand-wordmark" style={{ fontSize: '28px', display: 'block', marginBottom: '20px' }}>
                    Ink<span>board</span>
                </div>
                <h1 style={{
                    fontFamily: "'Playfair Display', serif", fontWeight: 800,
                    fontSize: 'clamp(24px, 4vw, 36px)', color: 'var(--color-primary)', marginBottom: '10px',
                }}>
                    What do you love to read?
                </h1>
                <p style={{ color: 'var(--color-muted)', fontSize: '15px', fontFamily: 'var(--font-ui)' }}>
                    Pick at least <strong>3 topics</strong> to personalise your feed
                </p>

                {/* Progress indicator */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: selected.size >= 3 ? 'rgba(233,69,96,0.08)' : 'var(--color-surface)',
                    border: `1.5px solid ${selected.size >= 3 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: '20px', padding: '6px 16px', marginTop: '16px',
                    transition: 'all 300ms',
                }}>
                    <span style={{
                        fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-ui)',
                        color: selected.size >= 3 ? 'var(--color-accent)' : 'var(--color-muted)',
                    }}>
                        {selected.size} / 3 minimum selected
                    </span>
                    {selected.size >= 3 && <Check size={14} style={{ color: 'var(--color-accent)' }} />}
                </div>
            </div>

            {/* Interest Chips Grid */}
            <div style={{
                maxWidth: '800px', margin: '0 auto',
                display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center',
                marginBottom: '48px',
            }}>
                {MOCK_INTERESTS.map(interest => (
                    <button
                        key={interest.id}
                        className={`interest-chip ${selected.has(interest.id) ? 'selected' : ''}`}
                        onClick={() => toggle(interest.id)}
                        aria-pressed={selected.has(interest.id)}
                    >
                        <span style={{ fontSize: '18px' }}>{interest.icon}</span>
                        {interest.name}
                        {selected.has(interest.id) && (
                            <Check size={14} style={{ marginLeft: '2px' }} />
                        )}
                    </button>
                ))}
            </div>

            {/* Continue Button */}
            <div style={{ textAlign: 'center', position: 'sticky', bottom: '24px' }}>
                <button
                    className="btn btn-primary btn-lg"
                    disabled={!canContinue}
                    onClick={() => setStep('profile')}
                    style={{
                        opacity: canContinue ? 1 : 0.4,
                        cursor: canContinue ? 'pointer' : 'not-allowed',
                        boxShadow: canContinue ? '0 8px 24px rgba(233,69,96,0.3)' : 'none',
                        transition: 'all 200ms',
                        minWidth: '220px',
                    }}
                >
                    Continue →
                </button>
            </div>
        </div>
    );
}
