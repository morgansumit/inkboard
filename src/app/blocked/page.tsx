import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Not Available | centsably',
    description: 'centsably is currently only available in Europe.',
};

export default function GeoBlockPage() {
    return (
        <div className="geo-block-page">
            <div style={{ maxWidth: '480px' }}>
                <div style={{ fontSize: '72px', marginBottom: '24px' }}>🌍</div>
                <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '32px', fontWeight: 800, marginBottom: '16px', color: 'white',
                }}>
                    centsably is only available in Europe
                </h1>
                <p style={{
                    fontFamily: "'Merriweather', Georgia, serif",
                    fontSize: '16px', lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.65)', marginBottom: '32px',
                }}>
                    We're a privacy-first platform built for European writers and readers, in full compliance with GDPR.
                    Access from your region is not currently available.
                </p>
                <div style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px', padding: '18px 20px',
                    fontFamily: 'var(--font-ui)', fontSize: '13px',
                    color: 'rgba(255,255,255,0.45)',
                }}>
                    HTTP 451 — Unavailable For Legal Reasons
                </div>
            </div>
        </div>
    );
}
