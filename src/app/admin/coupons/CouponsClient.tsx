'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Copy, Gift, Tag, Percent, ExternalLink } from 'lucide-react';

interface Coupon {
    id: string;
    title: string;
    description: string;
    code: string;
    discount: string;
    brand: string;
    brandLogo?: string;
    coverImage: string;
    targetUrl: string;
    category: string;
    expiresAt?: string;
    isActive: boolean;
    clicks: number;
    createdAt: string;
}

const COUPON_CATEGORIES = ['Fashion', 'Food', 'Tech', 'Travel', 'Beauty', 'Health', 'Entertainment', 'Other'];

export function CouponsClient() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        code: '',
        discount: '',
        brand: '',
        coverImage: '',
        targetUrl: '',
        category: 'Other',
        expiresAt: '',
    });

    // Load coupons from API
    const loadCoupons = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/coupons');
            if (res.ok) {
                const data = await res.json();
                setCoupons(data.coupons || []);
            }
        } catch (err) {
            console.error('Failed to load coupons:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCoupons();
    }, [loadCoupons]);

    const handleAddCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const res = await fetch('/api/admin/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    isActive: true,
                }),
            });

            if (res.ok) {
                const newCoupon = await res.json();
                setCoupons(prev => [newCoupon, ...prev]);
                setShowAddForm(false);
                setFormData({
                    title: '',
                    description: '',
                    code: '',
                    discount: '',
                    brand: '',
                    coverImage: '',
                    targetUrl: '',
                    category: 'Other',
                    expiresAt: '',
                });
            }
        } catch (err) {
            console.error('Failed to add coupon:', err);
            alert('Failed to add coupon');
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;

        try {
            const res = await fetch(`/api/admin/coupons?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setCoupons(prev => prev.filter(c => c.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete coupon:', err);
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/admin/coupons', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !isActive }),
            });

            if (res.ok) {
                setCoupons(prev => prev.map(c => 
                    c.id === id ? { ...c, isActive: !isActive } : c
                ));
            }
        } catch (err) {
            console.error('Failed to toggle coupon:', err);
        }
    };

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
            {/* Header */}
            <div style={{ 
                background: 'var(--color-surface)', 
                borderBottom: '1px solid var(--color-border)',
                padding: '20px 32px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}>
                <Link href="/admin" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    color: 'var(--color-muted)',
                    textDecoration: 'none',
                    fontSize: '14px'
                }}>
                    <ArrowLeft size={18} />
                    Back to Admin
                </Link>
                <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />
                <h1 style={{ 
                    fontFamily: 'var(--font-serif)', 
                    fontSize: '24px', 
                    fontWeight: 700,
                    margin: 0
                }}>
                    <Gift size={24} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
                    Coupons & Deals
                </h1>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        background: '#111827',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    <Plus size={18} />
                    Add Coupon
                </button>
            </div>

            <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Add Coupon Form */}
                {showAddForm && (
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: '16px',
                        padding: '28px',
                        marginBottom: '32px',
                        boxShadow: 'var(--shadow-card)'
                    }}>
                        <h2 style={{ 
                            fontFamily: 'var(--font-serif)', 
                            fontSize: '20px', 
                            fontWeight: 700,
                            marginBottom: '24px'
                        }}>
                            Add New Coupon
                        </h2>
                        <form onSubmit={handleAddCoupon}>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '20px',
                                marginBottom: '24px'
                            }}>
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., 50% Off Summer Sale"
                                        value={formData.title}
                                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Brand Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Nike, Amazon"
                                        value={formData.brand}
                                        onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        <Tag size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                        Coupon Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., SUMMER50"
                                        value={formData.code}
                                        onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px',
                                            fontFamily: 'monospace',
                                            letterSpacing: '1px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        <Percent size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                        Discount *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., 50% OFF, $20 OFF"
                                        value={formData.discount}
                                        onChange={e => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px',
                                            background: 'var(--color-surface)'
                                        }}
                                    >
                                        {COUPON_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Expires At
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expiresAt}
                                        onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Brief description of the offer..."
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Cover Image URL *
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://..."
                                        value={formData.coverImage}
                                        onChange={e => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Target URL * (where user goes after clicking)
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://brand.com/offer..."
                                        value={formData.targetUrl}
                                        onChange={e => setFormData(prev => ({ ...prev, targetUrl: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '12px 24px',
                                        background: '#111827',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}
                                >
                                    Save Coupon
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'transparent',
                                        color: 'var(--color-muted)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Coupons List */}
                {loading ? (
                    <p style={{ color: 'var(--color-muted)' }}>Loading coupons...</p>
                ) : coupons.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: 'var(--color-surface)',
                        borderRadius: '16px'
                    }}>
                        <Gift size={48} style={{ color: 'var(--color-muted)', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                            No coupons yet
                        </h3>
                        <p style={{ color: 'var(--color-muted)' }}>
                            Add your first coupon to display on the Explore page
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                    }}>
                        {coupons.map(coupon => (
                            <div
                                key={coupon.id}
                                style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-card)',
                                    opacity: coupon.isActive ? 1 : 0.6
                                }}
                            >
                                {/* Cover Image */}
                                <div style={{ position: 'relative', height: '160px' }}>
                                    <img
                                        src={coupon.coverImage}
                                        alt={coupon.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        display: 'flex',
                                        gap: '8px'
                                    }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: coupon.isActive ? '#D1FAE5' : '#E5E7EB',
                                            color: coupon.isActive ? '#065F46' : '#374151',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: 700
                                        }}>
                                            {coupon.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div style={{ padding: '20px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '8px'
                                    }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: 'var(--color-bg)',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: 'var(--color-muted)'
                                        }}>
                                            {coupon.category}
                                        </span>
                                        <span style={{
                                            fontSize: '12px',
                                            color: 'var(--color-muted)'
                                        }}>
                                            {coupon.brand}
                                        </span>
                                    </div>

                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        marginBottom: '8px',
                                        lineHeight: 1.3
                                    }}>
                                        {coupon.title}
                                    </h3>

                                    <p style={{
                                        fontSize: '13px',
                                        color: 'var(--color-muted)',
                                        marginBottom: '16px',
                                        lineHeight: 1.5
                                    }}>
                                        {coupon.description}
                                    </p>

                                    {/* Discount Badge */}
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        background: '#E94560',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        marginBottom: '16px'
                                    }}>
                                        <Percent size={16} />
                                        {coupon.discount}
                                    </div>

                                    {/* Coupon Code */}
                                    <div style={{
                                        background: 'var(--color-bg)',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '16px',
                                        border: '2px dashed var(--color-border)'
                                    }}>
                                        <code style={{
                                            fontFamily: 'monospace',
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            letterSpacing: '2px',
                                            color: 'var(--color-primary)'
                                        }}>
                                            {coupon.code}
                                        </code>
                                        <button
                                            onClick={() => copyCode(coupon.code, coupon.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 14px',
                                                background: copiedId === coupon.id ? '#D1FAE5' : '#111827',
                                                color: copiedId === coupon.id ? '#065F46' : '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {copiedId === coupon.id ? (
                                                <>Copied!</>
                                            ) : (
                                                <>
                                                    <Copy size={14} />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Stats & Actions */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingTop: '16px',
                                        borderTop: '1px solid var(--color-border)'
                                    }}>
                                        <span style={{
                                            fontSize: '12px',
                                            color: 'var(--color-muted)'
                                        }}>
                                            {coupon.clicks} clicks
                                        </span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'transparent',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {coupon.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <a
                                                href={coupon.targetUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '32px',
                                                    height: '32px',
                                                    background: 'var(--color-bg)',
                                                    borderRadius: '6px',
                                                    color: 'var(--color-muted)',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteCoupon(coupon.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '32px',
                                                    height: '32px',
                                                    background: '#FEE2E2',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: '#991B1B',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
