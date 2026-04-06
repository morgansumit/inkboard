'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

interface Policy {
    id: string;
    slug: string;
    title: string;
    content: string;
    description: string;
    last_updated: string;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
    return markdown
        .replace(/^# (.*$)/gim, '<h1 style="font-size:28px;font-weight:800;margin:24px 0 16px;">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size:22px;font-weight:700;margin:24px 0 12px;">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 style="font-size:18px;font-weight:700;margin:20px 0 10px;">$1</h3>')
        .replace(/^- (.*$)/gim, '<li style="margin:8px 0;">$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li style="margin:8px 0;">$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
}

export default function PolicyPage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [allPolicies, setAllPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [policyRes, listRes] = await Promise.all([
                    fetch(`/api/policies?slug=${slug}`),
                    fetch('/api/policies')
                ]);

                if (policyRes.ok) {
                    const policyData = await policyRes.json();
                    setPolicy(policyData.policy);
                } else {
                    setError('Policy not found');
                }

                if (listRes.ok) {
                    const listData = await listRes.json();
                    setAllPolicies(listData.policies || []);
                }
            } catch (err) {
                setError('Failed to load policy');
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchData();
        }
    }, [slug]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Loading...</p>
            </div>
        );
    }

    if (error || !policy) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8f8f8', padding: '40px 20px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <Shield size={48} style={{ color: '#999', marginBottom: '16px' }} />
                    <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Policy Not Found</h1>
                    <p style={{ color: '#666', marginBottom: '24px' }}>The policy you're looking for doesn't exist or has been removed.</p>
                    <Link href="/" style={{ color: '#111', textDecoration: 'underline' }}>Go back home</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', textDecoration: 'none', fontSize: '14px' }}>
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '40px' }}>
                {/* Sidebar */}
                <div>
                    <div style={{ position: 'sticky', top: '24px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                            Legal Policies
                        </h2>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {allPolicies.map(p => (
                                <Link
                                    key={p.id}
                                    href={`/policy/${p.slug}`}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        background: p.slug === slug ? '#111' : 'transparent',
                                        color: p.slug === slug ? '#fff' : '#333'
                                    }}
                                >
                                    {p.title}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e5e5e5' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={20} color="#333" />
                                </div>
                                <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>{policy.title}</h1>
                            </div>
                            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>{policy.description}</p>
                            <p style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>
                                Last updated: {new Date(policy.last_updated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>

                        <div 
                            style={{ fontSize: '16px', lineHeight: '1.8', color: '#333' }}
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(policy.content) }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
