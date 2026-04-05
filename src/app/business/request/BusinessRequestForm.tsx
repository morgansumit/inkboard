'use client';

import { useState } from 'react';

type Props = {
    defaultBusinessName?: string | null;
    defaultWebsite?: string | null;
    existingRequest?: {
        id?: string;
        status?: string | null;
        created_at?: string | null;
        reviewed_by?: string | null;
        reviewer_note?: string | null;
    } | null;
};

export function BusinessRequestForm({ defaultBusinessName, defaultWebsite, existingRequest }: Props) {
    const [businessName, setBusinessName] = useState(defaultBusinessName ?? '');
    const [websiteUrl, setWebsiteUrl] = useState(defaultWebsite ?? '');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const requestStatus = String(existingRequest?.status || '').toUpperCase();
    const isPending = requestStatus === 'PENDING';
    const isApproved = requestStatus === 'APPROVED';

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isPending || isApproved) {
            return;
        }
        setSubmitting(true);
        setMessage(null);
        setError(null);

        try {
            const res = await fetch('/api/business/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessName, websiteUrl, description }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || 'Failed to submit request');
            } else {
                setMessage(data?.message || 'Request submitted.');
                setDescription('');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="business-request-form" data-admin-editable="true">
            {(isPending || isApproved) && (
                <div className={`business-callout ${isApproved ? 'success' : 'pending'}`}>
                    {isApproved ? (
                        <>
                            <strong>Approved</strong> — Your brand already has access. Head to the Ads Center to launch your next campaign.
                        </>
                    ) : (
                        <>
                            <strong>In review</strong> — Our ops team typically responds within 48 hours. We’ll email you as soon as it’s approved.
                        </>
                    )}
                </div>
            )}

            <div className="form-grid">
                <div className="form-group">
                    <label htmlFor="business-name">Business / brand name *</label>
                    <input
                        id="business-name"
                        className="input"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="e.g. Aurora Studio"
                        required
                        disabled={isPending || isApproved || submitting}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="website">Website or portfolio (optional)</label>
                    <input
                        id="website"
                        className="input"
                        type="url"
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourdomain.com"
                        disabled={isPending || isApproved || submitting}
                    />
                </div>
            </div>

            <div className="form-group" data-admin-editable="true">
                <label htmlFor="description">Describe your business and advertising goals *</label>
                <textarea
                    id="description"
                    className="input business-textarea"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell us about your audience, campaign goals, and how you plan to use purseable ads."
                    rows={5}
                    required
                    disabled={isPending || isApproved || submitting}
                />
                <p className="field-hint">Share clear goals, campaign budgets, or past collaborations to help us approve you faster.</p>
            </div>

            <div className="form-footer">
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || isPending || isApproved}>
                    {isApproved ? 'Already approved' : isPending ? 'Awaiting review' : submitting ? 'Sending…' : 'Submit request'}
                </button>
                <p className="form-legal">We review every request to keep purseable spam-free. By submitting, you agree to our Ads Terms.</p>
            </div>

            {message && <div className="business-callout success">{message}</div>}
            {error && <div className="business-callout error">{error}</div>}
            {existingRequest?.reviewer_note && (
                <div className="business-callout note">{existingRequest.reviewer_note}</div>
            )}
        </form>
    );
}

export default BusinessRequestForm;
