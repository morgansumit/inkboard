'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FunLoader } from '@/components/FunLoader';
import Link from 'next/link';
import { 
    Sparkles, 
    Crown, 
    TrendingUp, 
    MousePointer, 
    Eye, 
    Heart, 
    Share2, 
    MessageCircle, 
    Bookmark,
    Target,
    Zap,
    ArrowRight,
    Lock,
    CheckCircle,
    X
} from 'lucide-react';

interface KeywordPerformance {
    keyword: string;
    category: string;
    totalImpressions: number;
    totalClicks: number;
    effectiveCtr: string;
    avgCpc: number;
    appearances: number;
}

interface EngagementStats {
    saves: number;
    shares: number;
    comments: number;
    likes: number;
    pins: number;
    total: number;
}

interface CTRInsights {
    overallCTR: string;
    bestPerformingTags: string[];
    underperformingTags: string[];
}

interface ProInsights {
    keywordOpportunities: string[];
    competitiveBenchmark: {
        avgQualityScore: string;
        avgCPCRange: { min: string; max: string };
        avgAdRank: string;
    };
    engagementBenchmarks: {
        engagementRate: string;
        savesPerClick: string;
        shareRate: string;
    };
}

interface ProAnalyticsData {
    success: boolean;
    isPro: boolean;
    planExpired: boolean;
    canUpgrade: boolean;
    insights: {
        topKeywords: KeywordPerformance[];
        engagementStats: EngagementStats;
        ctrInsights: CTRInsights;
        proInsights: ProInsights | null;
        preview: {
            keywordCount: number;
            topKeyword: KeywordPerformance;
            engagementPreview: boolean;
            message: string;
        } | null;
    } | null;
}

export default function ProAnalyticsDashboard() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProAnalyticsData | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

    useEffect(() => {
        fetchProAnalytics();
    }, []);

    const fetchProAnalytics = async () => {
        try {
            const res = await fetch('/api/business/ads/pro-analytics?days=30');
            const result = await res.json();
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            console.error('Failed to load pro analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        // In production, this would redirect to Stripe checkout
        alert('Upgrade flow would redirect to payment processor');
    };

    if (loading) {
        return (
            <FunLoader />
        );
    }

    if (!data?.insights) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>No data available. Create ads to see Pro analytics.</p>
            </div>
        );
    }

    const { insights, isPro, canUpgrade } = data;
    const hasFullAccess = isPro && !data.planExpired;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header with Pro Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700 }}>
                            Pro Analytics
                        </h1>
                        {hasFullAccess && (
                            <span style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 700
                            }}>
                                <Crown size={14} /> PRO
                            </span>
                        )}
                    </div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                        Advanced keyword insights, engagement metrics, and CTR optimization
                    </p>
                </div>
                
                {canUpgrade && (
                    <button 
                        onClick={() => setShowUpgradeModal(true)}
                        className="btn btn-primary"
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            border: 'none'
                        }}
                    >
                        <Crown size={18} />
                        Upgrade to Pro
                    </button>
                )}
            </div>

            {/* Pro Feature Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* Top Keywords Card */}
                <FeatureCard
                    title="Top Performing Keywords"
                    icon={<Target size={20} color="#3B82F6" />}
                    isPro={hasFullAccess}
                >
                    {insights.topKeywords.length > 0 ? (
                        <div>
                            {insights.topKeywords.slice(0, hasFullAccess ? 10 : 3).map((kw, idx) => (
                                <div 
                                    key={kw.keyword}
                                    onClick={() => hasFullAccess && setSelectedKeyword(kw.keyword)}
                                    style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 0',
                                        borderBottom: idx < insights.topKeywords.length - 1 ? '1px solid var(--color-border)' : 'none',
                                        cursor: hasFullAccess ? 'pointer' : 'default'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ 
                                                width: '20px', 
                                                textAlign: 'center',
                                                color: idx < 3 ? '#F59E0B' : 'var(--color-muted)',
                                                fontWeight: 700 
                                            }}>
                                                #{idx + 1}
                                            </span>
                                            {kw.keyword}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '28px' }}>
                                            {kw.totalImpressions.toLocaleString()} impressions • ${kw.avgCpc.toFixed(2)} avg CPC
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>
                                            {kw.effectiveCtr}%
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>CTR</div>
                                    </div>
                                </div>
                            ))}
                            
                            {!hasFullAccess && insights.topKeywords.length > 3 && (
                                <div style={{ 
                                    padding: '16px', 
                                    textAlign: 'center',
                                    background: '#FEF3C7',
                                    borderRadius: '8px',
                                    marginTop: '12px'
                                }}>
                                    <Lock size={16} style={{ marginBottom: '8px', color: '#92400E' }} />
                                    <p style={{ fontSize: '13px', color: '#92400E' }}>
                                        {insights.topKeywords.length - 3} more keywords locked
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-muted)', padding: '20px', textAlign: 'center' }}>
                            No keyword data yet. Target better keywords to improve performance.
                        </p>
                    )}
                </FeatureCard>

                {/* Engagement Metrics Card */}
                <FeatureCard
                    title="Engagement Metrics"
                    icon={<Heart size={20} color="#EF4444" />}
                    isPro={hasFullAccess}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <EngagementMetric 
                            icon={<Bookmark size={18} />}
                            label="Saves"
                            value={insights.engagementStats.saves}
                            color="#3B82F6"
                        />
                        <EngagementMetric 
                            icon={<Share2 size={18} />}
                            label="Shares"
                            value={insights.engagementStats.shares}
                            color="#10B981"
                        />
                        <EngagementMetric 
                            icon={<MessageCircle size={18} />}
                            label="Comments"
                            value={insights.engagementStats.comments}
                            color="#8B5CF6"
                        />
                        <EngagementMetric 
                            icon={<Heart size={18} />}
                            label="Likes"
                            value={insights.engagementStats.likes}
                            color="#EF4444"
                        />
                    </div>
                    
                    {hasFullAccess && insights.proInsights && (
                        <div style={{ marginTop: '16px', padding: '12px', background: '#F0FDF4', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span>Engagement Rate</span>
                                <span style={{ fontWeight: 600, color: '#059669' }}>{insights.proInsights.engagementBenchmarks.engagementRate}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
                                <span>Saves per Click</span>
                                <span style={{ fontWeight: 600, color: '#059669' }}>{insights.proInsights.engagementBenchmarks.savesPerClick}</span>
                            </div>
                        </div>
                    )}
                </FeatureCard>

                {/* CTR Insights Card */}
                <FeatureCard
                    title="Click-to-Impression Insights"
                    icon={<MousePointer size={20} color="#8B5CF6" />}
                    isPro={hasFullAccess}
                >
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '48px', fontWeight: 700, color: '#8B5CF6' }}>
                            {insights.ctrInsights.overallCTR}%
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '8px' }}>
                            Overall Click-Through Rate
                        </div>
                    </div>

                    {hasFullAccess && (
                        <>
                            <div style={{ marginTop: '16px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                                    <CheckCircle size={14} style={{ color: '#10B981', marginRight: '6px' }} />
                                    Best Performing Tags
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {insights.ctrInsights.bestPerformingTags.map(tag => (
                                        <span key={tag} style={{ 
                                            padding: '4px 12px', 
                                            background: '#D1FAE5', 
                                            color: '#065F46',
                                            borderRadius: '12px',
                                            fontSize: '12px'
                                        }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {insights.ctrInsights.underperformingTags.length > 0 && (
                                <div style={{ marginTop: '16px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                                        <X size={14} style={{ color: '#EF4444', marginRight: '6px' }} />
                                        Consider Replacing
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {insights.ctrInsights.underperformingTags.map(tag => (
                                            <span key={tag} style={{ 
                                                padding: '4px 12px', 
                                                background: '#FEE2E2', 
                                                color: '#991B1B',
                                                borderRadius: '12px',
                                                fontSize: '12px'
                                            }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </FeatureCard>
            </div>

            {/* Pro Insights Section (Full Access Only) */}
            {hasFullAccess && insights.proInsights && (
                <div style={{ 
                    background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                    padding: '32px',
                    borderRadius: '16px',
                    color: 'white',
                    marginBottom: '32px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Zap size={24} style={{ color: '#FCD34D' }} />
                        Pro Keyword Recommendations
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        {insights.proInsights.keywordOpportunities.slice(0, 6).map((kw, idx) => (
                            <div 
                                key={idx}
                                style={{ 
                                    background: 'rgba(255,255,255,0.1)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                                    {kw}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', opacity: 0.8 }}>
                                    <TrendingUp size={14} />
                                    High opportunity keyword
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Competitive Benchmarks</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
                            <div>
                                <span style={{ opacity: 0.7 }}>Avg Quality Score</span>
                                <div style={{ fontSize: '20px', fontWeight: 700 }}>{insights.proInsights.competitiveBenchmark.avgQualityScore}/10</div>
                            </div>
                            <div>
                                <span style={{ opacity: 0.7 }}>CPC Range</span>
                                <div style={{ fontSize: '20px', fontWeight: 700 }}>${insights.proInsights.competitiveBenchmark.avgCPCRange.min} - ${insights.proInsights.competitiveBenchmark.avgCPCRange.max}</div>
                            </div>
                            <div>
                                <span style={{ opacity: 0.7 }}>Avg Ad Rank</span>
                                <div style={{ fontSize: '20px', fontWeight: 700 }}>{insights.proInsights.competitiveBenchmark.avgAdRank}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div style={{
                        background: 'white',
                        padding: '32px',
                        borderRadius: '16px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <div style={{ 
                            width: '60px', 
                            height: '60px',
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <Crown size={32} color="white" />
                        </div>
                        
                        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                            Upgrade to Pro
                        </h2>
                        <p style={{ color: 'var(--color-muted)', marginBottom: '24px' }}>
                            Get advanced keyword insights, engagement analytics, and CTR optimization recommendations
                        </p>

                        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                            <ProFeatureItem text="Unlimited keyword performance tracking" />
                            <ProFeatureItem text="Engagement metrics (saves, shares, comments)" />
                            <ProFeatureItem text="CTR insights & underperforming tag alerts" />
                            <ProFeatureItem text="AI-powered keyword recommendations" />
                            <ProFeatureItem text="Competitive benchmarks & Quality Score tracking" />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setShowUpgradeModal(false)}
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Maybe Later
                            </button>
                            <button 
                                onClick={handleUpgrade}
                                className="btn btn-primary"
                                style={{ 
                                    flex: 1,
                                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                    border: 'none'
                                }}
                            >
                                Upgrade $29/mo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-components
function FeatureCard({ 
    title, 
    icon, 
    children, 
    isPro 
}: { 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode;
    isPro: boolean;
}) {
    return (
        <div style={{ 
            background: 'var(--color-surface)', 
            padding: '24px', 
            borderRadius: '12px', 
            border: '1px solid var(--color-border)',
            position: 'relative',
            opacity: isPro ? 1 : 0.95
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--color-border)'
            }}>
                {icon}
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{title}</h3>
            </div>
            {children}
        </div>
    );
}

function EngagementMetric({ 
    icon, 
    label, 
    value, 
    color 
}: { 
    icon: React.ReactNode; 
    label: string; 
    value: number;
    color: string;
}) {
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '12px',
            background: '#F9FAFB',
            borderRadius: '8px'
        }}>
            <div style={{ color }}>{icon}</div>
            <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color }}>
                    {value.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{label}</div>
            </div>
        </div>
    );
}

function ProFeatureItem({ text }: { text: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <CheckCircle size={18} style={{ color: '#10B981', flexShrink: 0 }} />
            <span style={{ fontSize: '14px' }}>{text}</span>
        </div>
    );
}
