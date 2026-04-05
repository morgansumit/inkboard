'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Edit3, FileText, Shield, Eye, EyeOff, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Policy {
    id: string;
    slug: string;
    title: string;
    content: string;
    description: string;
    isPublished: boolean;
    lastUpdated: string;
    createdAt: string;
    order: number;
}

const DEFAULT_POLICIES = [
    { slug: 'terms', title: 'Terms of Service', description: 'User agreement and service terms' },
    { slug: 'privacy', title: 'Privacy Policy', description: 'How we collect and use your data' },
    { slug: 'content', title: 'Content Policy', description: 'Rules for user-generated content' },
    { slug: 'community', title: 'Community Guidelines', description: 'Behavioral expectations for users' },
    { slug: 'cookies', title: 'Cookie Policy', description: 'How we use cookies and tracking' },
    { slug: 'copyright', title: 'Copyright Policy', description: 'DMCA and intellectual property' },
];

export function PoliciesClient() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        description: '',
        content: '',
    });

    // Load policies
    const loadPolicies = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/policies');
            if (res.ok) {
                const data = await res.json();
                setPolicies(data.policies || []);
            }
        } catch (err) {
            console.error('Failed to load policies:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPolicies();
    }, [loadPolicies]);

    const handleAddPolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const res = await fetch('/api/admin/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const newPolicy = await res.json();
                setPolicies(prev => [...prev, newPolicy]);
                setShowAddForm(false);
                setFormData({ slug: '', title: '', description: '', content: '' });
            }
        } catch (err) {
            console.error('Failed to add policy:', err);
            alert('Failed to add policy');
        }
    };

    const handleUpdatePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;

        try {
            const res = await fetch('/api/admin/policies', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingId, ...formData }),
            });

            if (res.ok) {
                const updated = await res.json();
                setPolicies(prev => prev.map(p => p.id === editingId ? updated : p));
                setEditingId(null);
                setFormData({ slug: '', title: '', description: '', content: '' });
            }
        } catch (err) {
            console.error('Failed to update policy:', err);
        }
    };

    const handleDeletePolicy = async (id: string) => {
        if (!confirm('Are you sure you want to delete this policy?')) return;

        try {
            const res = await fetch(`/api/admin/policies?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setPolicies(prev => prev.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete policy:', err);
        }
    };

    const handleTogglePublish = async (id: string, isPublished: boolean) => {
        try {
            const res = await fetch('/api/admin/policies', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isPublished: !isPublished }),
            });

            if (res.ok) {
                setPolicies(prev => prev.map(p => 
                    p.id === id ? { ...p, isPublished: !isPublished } : p
                ));
            }
        } catch (err) {
            console.error('Failed to toggle policy:', err);
        }
    };

    const startEditing = (policy: Policy) => {
        setEditingId(policy.id);
        setFormData({
            slug: policy.slug,
            title: policy.title,
            description: policy.description,
            content: policy.content,
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setFormData({ slug: '', title: '', description: '', content: '' });
    };

    const generateSlug = (title: string) => {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
                    <Shield size={24} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
                    Legal Policies
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
                    Add Policy
                </button>
            </div>

            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Quick Add Templates */}
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
                            marginBottom: '20px'
                        }}>
                            Add New Policy
                        </h2>

                        {/* Quick Templates */}
                        <div style={{ marginBottom: '24px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '12px' }}>
                                Quick templates:
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {DEFAULT_POLICIES.map(template => (
                                    <button
                                        key={template.slug}
                                        onClick={() => setFormData({
                                            ...formData,
                                            slug: template.slug,
                                            title: template.title,
                                            description: template.description,
                                        })}
                                        style={{
                                            padding: '8px 14px',
                                            background: formData.slug === template.slug ? '#111' : '#f0f0f0',
                                            color: formData.slug === template.slug ? '#fff' : '#333',
                                            border: 'none',
                                            borderRadius: '20px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500
                                        }}
                                    >
                                        {template.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleAddPolicy}>
                            <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                                            placeholder="e.g., Terms of Service"
                                            value={formData.title}
                                            onChange={e => {
                                                const title = e.target.value;
                                                setFormData(prev => ({ 
                                                    ...prev, 
                                                    title,
                                                    slug: prev.slug || generateSlug(title)
                                                }));
                                            }}
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
                                            URL Slug *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g., terms-of-service"
                                            value={formData.slug}
                                            onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
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
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        marginBottom: '6px'
                                    }}>
                                        Short Description *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Brief description of this policy"
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                                        Policy Content (Markdown supported) *
                                    </label>
                                    <textarea
                                        rows={12}
                                        required
                                        placeholder="# Terms of Service\n\nEnter your policy content here...\n\n## Section 1\nYour content here..."
                                        value={formData.content}
                                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '14px',
                                            resize: 'vertical',
                                            fontFamily: 'monospace'
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
                                    Save Policy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setFormData({ slug: '', title: '', description: '', content: '' });
                                    }}
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

                {/* Policies List */}
                {loading ? (
                    <p style={{ color: 'var(--color-muted)' }}>Loading policies...</p>
                ) : policies.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: 'var(--color-surface)',
                        borderRadius: '16px'
                    }}>
                        <Shield size={48} style={{ color: 'var(--color-muted)', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                            No policies yet
                        </h3>
                        <p style={{ color: 'var(--color-muted)' }}>
                            Add your first legal policy to display on the site
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {policies.sort((a, b) => a.order - b.order).map(policy => (
                            <div
                                key={policy.id}
                                style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-card)',
                                    border: editingId === policy.id ? '2px solid #111' : 'none'
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    padding: '20px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    borderBottom: expandedId === policy.id || editingId === policy.id ? '1px solid var(--color-border)' : 'none'
                                }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: policy.isPublished ? '#D1FAE5' : '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {policy.isPublished ? (
                                            <Eye size={20} color="#065F46" />
                                        ) : (
                                            <EyeOff size={20} color="#6B7280" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                                            {policy.title}
                                        </h3>
                                        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                                            /policy/{policy.slug} • {policy.description}
                                        </p>
                                    </div>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        background: policy.isPublished ? '#D1FAE5' : '#F3F4F6',
                                        color: policy.isPublished ? '#065F46' : '#6B7280'
                                    }}>
                                        {policy.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleTogglePublish(policy.id, policy.isPublished)}
                                            style={{
                                                padding: '8px',
                                                background: 'transparent',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                color: 'var(--color-muted)'
                                            }}
                                            title={policy.isPublished ? 'Unpublish' : 'Publish'}
                                        >
                                            {policy.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button
                                            onClick={() => editingId === policy.id ? cancelEditing() : startEditing(policy)}
                                            style={{
                                                padding: '8px',
                                                background: editingId === policy.id ? '#FEF3C7' : 'transparent',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                color: editingId === policy.id ? '#92400E' : 'var(--color-muted)'
                                            }}
                                            title="Edit"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePolicy(policy.id)}
                                            style={{
                                                padding: '8px',
                                                background: 'transparent',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                color: '#DC2626'
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setExpandedId(expandedId === policy.id ? null : policy.id)}
                                            style={{
                                                padding: '8px',
                                                background: 'transparent',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                color: 'var(--color-muted)'
                                            }}
                                        >
                                            {expandedId === policy.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Edit Form */}
                                {editingId === policy.id && (
                                    <div style={{ padding: '24px' }}>
                                        <form onSubmit={handleUpdatePolicy}>
                                            <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                                                            Title
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={formData.title}
                                                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--color-border)',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                                                            Slug
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={formData.slug}
                                                            onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--color-border)',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                                                        Description
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.description}
                                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--color-border)',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                                                        Content (Markdown)
                                                    </label>
                                                    <textarea
                                                        rows={10}
                                                        required
                                                        value={formData.content}
                                                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--color-border)',
                                                            fontSize: '14px',
                                                            resize: 'vertical',
                                                            fontFamily: 'monospace'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    type="submit"
                                                    style={{
                                                        padding: '10px 20px',
                                                        background: '#111827',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <Save size={16} />
                                                    Save Changes
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelEditing}
                                                    style={{
                                                        padding: '10px 20px',
                                                        background: 'transparent',
                                                        color: 'var(--color-muted)',
                                                        border: '1px solid var(--color-border)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <X size={16} />
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Preview Content */}
                                {expandedId === policy.id && !editingId && (
                                    <div style={{ padding: '24px', background: '#FAFAFA' }}>
                                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '12px' }}>
                                            Last updated: {new Date(policy.lastUpdated).toLocaleString()}
                                        </p>
                                        <div 
                                            style={{ 
                                                fontSize: '14px', 
                                                lineHeight: '1.6',
                                                whiteSpace: 'pre-wrap'
                                            }}
                                        >
                                            {policy.content.slice(0, 500)}{policy.content.length > 500 ? '...' : ''}
                                        </div>
                                        <Link 
                                            href={`/policy/${policy.slug}`}
                                            target="_blank"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginTop: '16px',
                                                padding: '8px 16px',
                                                background: '#fff',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                color: '#111',
                                                fontSize: '13px',
                                                fontWeight: 600
                                            }}
                                        >
                                            <FileText size={14} />
                                            View Full Page
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
