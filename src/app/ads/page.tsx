'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, BarChart2, CheckCircle, XCircle, Clock, Megaphone } from 'lucide-react';
import Link from 'next/link';

export default function AdsDashboard() {
    const supabase = createClient();
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [businessRequest, setBusinessRequest] = useState<any>(null);
    const [requestForm, setRequestForm] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [description, setDescription] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);

    useEffect(() => {
        const fetchAds = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }
            setUser(session.user);

            // Fetch user profile to check if they are a business
            const { data: profile } = await supabase.from('users').select('is_business').eq('id', session.user.id).single();
            setProfile(profile);

            if (profile?.is_business) {
                const { data, error } = await supabase
                    .from('ads')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });
                if (data) setAds(data);
                setLoading(false);
            } else {
                // Instantly stop loading to show the fallback page!
                setLoading(false);

                // Lazily check if they have a pending business request without blocking the UI
                supabase.from('business_requests').select('*').eq('user_id', session.user.id).maybeSingle().then(({ data: request }: { data: any }) => {
                    if (request) setBusinessRequest(request);
                });
            }
        };
        fetchAds();
    }, [supabase]);

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRequestLoading(true);
        const { error } = await supabase.from('business_requests').insert({
            user_id: user.id,
            business_name: businessName,
            website_url: websiteUrl,
            description: description,
        });
        if (!error) {
            setBusinessRequest({ status: 'PENDING' });
            setRequestForm(false);
        } else {
            alert('Failed to submit request');
        }
        setRequestLoading(false);
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
                Loading ads...
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ padding: '40px', color: 'var(--color-muted)' }}>
                Please log in to manage your ad campaigns.
            </div>
        );
    }

    if (!profile?.is_business) {
        return (
            <div style={{ padding: '60px 40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-ui)', textAlign: 'center' }}>
                <Megaphone size={48} color="var(--color-accent)" style={{ margin: '0 auto 20px' }} />
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px' }}>
                    Inkboard Ads Network
                </h1>
                <p style={{ color: 'var(--color-muted)', fontSize: '16px', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
                    Access to the Ads Manager is strictly limited to verified business partners. If you would like to run sponsored content on Inkboard, you must apply for a Business Account.
                </p>

                {businessRequest ? (
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '32px', display: 'inline-block' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: businessRequest.status === 'REJECTED' ? '#DC2626' : '#D97706', marginBottom: '8px', justifyContent: 'center' }}>
                            {businessRequest.status === 'REJECTED' ? <XCircle size={20} /> : <Clock size={20} />}
                            <span style={{ fontWeight: 600 }}>Application {businessRequest.status}</span>
                        </div>
                        <p style={{ color: 'var(--color-muted)' }}>
                            {businessRequest.status === 'REJECTED' ? 'Your application to join the Ads Network was not approved at this time.' : 'Your application is currently being reviewed by our moderation team. Check back here shortly.'}
                        </p>
                    </div>
                ) : requestForm ? (
                    <form onSubmit={handleRequestSubmit} style={{ background: 'var(--color-surface)', padding: '32px', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Apply for a Business Account</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Business / Brand Name *</label>
                                <input className="input" autoFocus required value={businessName} onChange={e => setBusinessName(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Website URL</label>
                                <input className="input" type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Tell us about what you want to advertise *</label>
                                <textarea className="input" required value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setRequestForm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={requestLoading}>{requestLoading ? 'Submitting...' : 'Submit Application'}</button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setRequestForm(true)} className="btn btn-primary btn-lg">Apply for Business Access</button>
                )}
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-ui)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
                        Ads Manager
                    </h1>
                    <p style={{ color: 'var(--color-muted)' }}>Display targeted sponsored ads directly in the feed to reach interested people.</p>
                </div>
                <Link href="/ads/create" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} />
                    Create Ad Request
                </Link>
            </div>

            {ads.length === 0 ? (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: 'var(--color-surface)',
                    borderRadius: '16px',
                    border: '1px solid var(--color-border)'
                }}>
                    <BarChart2 size={48} color="var(--color-muted)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>No ad campaigns yet</h3>
                    <p style={{ color: 'var(--color-muted)', marginBottom: '24px' }}>
                        Reach a wider audience by running sponsored ads on the platform.
                    </p>
                    <Link href="/ads/create" className="btn btn-primary">Get Started</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {ads.map(ad => (
                        <div key={ad.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--color-surface)',
                            padding: '24px',
                            borderRadius: '12px',
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                {ad.image_url.match(/\.(mp4|webm|mov|ogg)$/i) || ad.image_url.includes('/video/upload/') ? (
                                    <video src={ad.image_url} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} muted autoPlay loop playsInline />
                                ) : (
                                    <img src={ad.image_url} alt={ad.title} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                                )}
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '4px' }}>{ad.title}</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '8px' }}>{ad.description || 'No description'}</p>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-muted)' }}>
                                        <span><strong>Views:</strong> {ad.views_count}</span>
                                        <span><strong>Clicks:</strong> {ad.clicks_count}</span>
                                        {ad.daily_budget > 0 && <span><strong>Daily Budget:</strong> ${ad.daily_budget}</span>}
                                        {ad.total_budget > 0 && <span><strong>Total Budget:</strong> ${ad.total_budget}</span>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                    background: ad.status === 'APPROVED' || ad.status === 'ACTIVE' ? '#D1FAE5' :
                                        ad.status === 'PENDING' ? '#FEF3C7' : '#FEE2E2',
                                    color: ad.status === 'APPROVED' || ad.status === 'ACTIVE' ? '#065F46' :
                                        ad.status === 'PENDING' ? '#92400E' : '#991B1B'
                                }}>
                                    {ad.status === 'APPROVED' || ad.status === 'ACTIVE' ? <CheckCircle size={14} /> :
                                        ad.status === 'PENDING' ? <Clock size={14} /> : <XCircle size={14} />}
                                    {ad.status}
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                                    {new Date(ad.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
