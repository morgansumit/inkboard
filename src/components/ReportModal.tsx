'use client';
import { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';

const REPORT_REASONS = [
    { id: 'spam', label: "It's spam", icon: '🚫' },
    { id: 'nudity_sexual', label: 'Nudity or sexual activity', icon: '🔞' },
    { id: 'hate_speech', label: 'Hate speech or symbols', icon: '🚷' },
    { id: 'harassment_bullying', label: 'Bullying or harassment', icon: '😤' },
    { id: 'violence', label: 'Violence or dangerous organizations', icon: '⚠️' },
    { id: 'false_information', label: 'False information', icon: '❌' },
    { id: 'intellectual_property', label: 'Intellectual property violation', icon: '©️' },
    { id: 'scam_fraud', label: 'Scam or fraud', icon: '🎭' },
    { id: 'self_harm', label: 'Suicide or self-injury', icon: '💔' },
    { id: 'other', label: 'Something else', icon: '📝' },
] as const;

interface ReportModalProps {
    postId: string;
    onClose: () => void;
}

export function ReportModal({ postId, onClose }: ReportModalProps) {
    const [step, setStep] = useState<'reason' | 'details' | 'success' | 'error'>('reason');
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSelectReason = (reasonId: string) => {
        setSelectedReason(reasonId);
        setStep('details');
    };

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/posts/${postId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: selectedReason, details: details.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMessage(data.error || 'Failed to submit report');
                setStep('error');
                return;
            }
            setStep('success');
        } catch {
            setErrorMessage('Network error. Please try again.');
            setStep('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            data-testid="report-modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                data-testid="report-modal"
                style={{
                    background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px',
                    maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid #e5e5e5',
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                        {step === 'reason' && 'Report'}
                        {step === 'details' && 'Tell us more'}
                        {step === 'success' && 'Thank you'}
                        {step === 'error' && 'Error'}
                    </h3>
                    <button
                        data-testid="report-modal-close"
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '4px', borderRadius: '50%', display: 'flex',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ overflow: 'auto', flex: 1 }}>
                    {step === 'reason' && (
                        <div>
                            <p style={{ padding: '16px 20px 8px', fontSize: '14px', color: '#666', margin: 0 }}>
                                Why are you reporting this post?
                            </p>
                            {REPORT_REASONS.map((reason) => (
                                <button
                                    key={reason.id}
                                    data-testid={`report-reason-${reason.id}`}
                                    onClick={() => handleSelectReason(reason.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        width: '100%', padding: '14px 20px', border: 'none',
                                        background: 'transparent', cursor: 'pointer', fontSize: '15px',
                                        textAlign: 'left', borderBottom: '1px solid #f0f0f0',
                                        transition: 'background 150ms',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{ fontSize: '18px' }}>{reason.icon}</span>
                                    <span style={{ flex: 1, fontWeight: 500 }}>{reason.label}</span>
                                    <span style={{ color: '#ccc', fontSize: '18px' }}>›</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 'details' && (
                        <div style={{ padding: '20px' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 14px', background: '#f5f5f5', borderRadius: '8px',
                                marginBottom: '16px', fontSize: '14px',
                            }}>
                                <span>{REPORT_REASONS.find(r => r.id === selectedReason)?.icon}</span>
                                <span style={{ fontWeight: 600 }}>
                                    {REPORT_REASONS.find(r => r.id === selectedReason)?.label}
                                </span>
                                <button
                                    onClick={() => { setStep('reason'); setSelectedReason(null); }}
                                    style={{
                                        marginLeft: 'auto', background: 'none', border: 'none',
                                        cursor: 'pointer', color: '#666', fontSize: '12px', fontWeight: 600,
                                    }}
                                >
                                    Change
                                </button>
                            </div>

                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                                Additional details (optional)
                            </label>
                            <textarea
                                data-testid="report-details"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Provide more context about why you're reporting this content..."
                                maxLength={500}
                                style={{
                                    width: '100%', minHeight: '100px', padding: '12px',
                                    border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '14px',
                                    resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <p style={{ fontSize: '12px', color: '#999', marginTop: '6px', textAlign: 'right' }}>
                                {details.length}/500
                            </p>

                            <button
                                data-testid="report-submit"
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '10px',
                                    border: 'none', background: '#DC2626', color: 'white',
                                    fontSize: '15px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.7 : 1, marginTop: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                }}
                            >
                                <AlertTriangle size={16} />
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: '#D1FAE5', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px',
                            }}>
                                <Check size={28} color="#065F46" />
                            </div>
                            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                                Thanks for reporting
                            </h4>
                            <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '20px' }}>
                                Your report helps keep our community safe. We'll review it and take action if it violates our guidelines.
                            </p>
                            <button
                                data-testid="report-done"
                                onClick={onClose}
                                style={{
                                    padding: '12px 32px', borderRadius: '10px',
                                    border: '1px solid #e0e0e0', background: 'white',
                                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: '#FEE2E2', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px',
                            }}>
                                <AlertTriangle size={28} color="#991B1B" />
                            </div>
                            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                                Something went wrong
                            </h4>
                            <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '20px' }}>
                                {errorMessage}
                            </p>
                            <button
                                onClick={() => { setStep('reason'); setErrorMessage(''); }}
                                style={{
                                    padding: '12px 32px', borderRadius: '10px',
                                    border: 'none', background: '#111', color: 'white',
                                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
