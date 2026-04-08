'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, TrendingUp, DollarSign, Target, Award, AlertCircle, Info } from 'lucide-react';
import { FunLoader } from '@/components/FunLoader';

interface AdAnalytics {
    id: string;
    title: string;
    status: string;
    max_cpc: number;
    quality_score: number;
    ad_rank: number;
    total_spend: number;
    total_budget: number;
    total_impressions: number;
    clicks_count: number;
    actual_cpc_charged: number;
    is_starter_boost: boolean;
    category: string;
}

interface AuctionSummary {
    total_auctions: number;
    wins: number;
    win_rate: string;
    avg_cpc: string;
    avg_position: string;
    total_charged: string;
}

interface PositionBreakdown {
    [key: number]: number;
}

export default function AdvertiserAnalyticsDashboard() {
    const supabase = createClient();
    const [ads, setAds] = useState<AdAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
    const [auctionData, setAuctionData] = useState<{
        summary: AuctionSummary;
        positions: PositionBreakdown;
        recommendations: string[];
    } | null>(null);
    const [auctionLoading, setAuctionLoading] = useState(false);

    useEffect(() => {
        loadAds();
    }, []);

    const loadAds = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
            .from('ads')
            .select('id, title, status, max_cpc, quality_score, ad_rank, total_spend, total_budget, total_impressions, clicks_count, actual_cpc_charged, is_starter_boost, category')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setAds(data);
            if (data.length > 0 && !selectedAdId) {
                setSelectedAdId(data[0].id);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        if (selectedAdId) {
            loadAuctionData(selectedAdId);
        }
    }, [selectedAdId]);

    const loadAuctionData = async (adId: string) => {
        setAuctionLoading(true);
        try {
            const res = await fetch(`/api/ads/auction?adId=${adId}&days=7`);
            const data = await res.json();
            if (data.success) {
                setAuctionData({
                    summary: data.summary,
                    positions: data.position_breakdown,
                    recommendations: data.recommendations
                });
            }
        } catch (err) {
            console.error('Failed to load auction data:', err);
        }
        setAuctionLoading(false);
    };

    const calculateCTR = (clicks: number, impressions: number) => {
        if (!impressions) return '0.0';
        return ((clicks / impressions) * 100).toFixed(1);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return '#10B981';
            case 'ACTIVE': return '#3B82F6';
            case 'PENDING': return '#F59E0B';
            case 'PAUSED': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const getQSDescription = (qs: number) => {
        if (qs >= 8) return 'Excellent';
        if (qs >= 6) return 'Good';
        if (qs >= 4) return 'Average';
        if (qs >= 3) return 'Below Average';
        return 'Poor (Min 3.0 to show)';
    };

    const getQSColor = (qs: number) => {
        if (qs >= 8) return '#059669';
        if (qs >= 6) return '#3B82F6';
        if (qs >= 4) return '#F59E0B';
        return '#EF4444';
    };

    if (loading) {
        return <FunLoader />;
    }

    if (ads.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                <BarChart3 size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>No ads found. Create your first ad to see analytics.</p>
            </div>
        );
    }

    const selectedAd = ads.find(a => a.id === selectedAdId);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                Ad Performance Analytics
            </h1>
            <p style={{ color: 'var(--color-muted)', marginBottom: '32px' }}>
                Track your Quality Score, auction performance, and optimization recommendations
            </p>

            {/* Ad Selector */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Select Ad</label>
                <select
                    value={selectedAdId || ''}
                    onChange={e => setSelectedAdId(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px' }}
                >
                    {ads.map(ad => (
                        <option key={ad.id} value={ad.id}>
                            {ad.title} ({ad.status}) - QS: {ad.quality_score?.toFixed(1) || '5.0'}
                        </option>
                    ))}
                </select>
            </div>

            {selectedAd && (
                <>
                    {/* Overview Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                        {/* Quality Score Card */}
                        <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Award size={18} color={getQSColor(selectedAd.quality_score || 5)} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>Quality Score</span>
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: getQSColor(selectedAd.quality_score || 5) }}>
                                {(selectedAd.quality_score || 5).toFixed(1)}<span style={{ fontSize: '16px' }}>/10</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                                {getQSDescription(selectedAd.quality_score || 5)}
                            </p>
                            {selectedAd.is_starter_boost && (
                                <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px' }}>
                                    Starter Boost Active
                                </span>
                            )}
                        </div>

                        {/* Ad Rank Card */}
                        <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <TrendingUp size={18} color="#3B82F6" />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>Ad Rank</span>
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: '#3B82F6' }}>
                                {(selectedAd.ad_rank || 0).toFixed(1)}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                                Bid × Quality Score
                            </p>
                        </div>

                        {/* CPC Card */}
                        <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <DollarSign size={18} color="#10B981" />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>Actual CPC</span>
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: '#10B981' }}>
                                ${(selectedAd.actual_cpc_charged || 0).toFixed(2)}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                                Max bid: ${(selectedAd.max_cpc || 0).toFixed(2)}
                            </p>
                        </div>

                        {/* CTR Card */}
                        <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Target size={18} color="#8B5CF6" />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>CTR</span>
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: '#8B5CF6' }}>
                                {calculateCTR(selectedAd.clicks_count || 0, selectedAd.total_impressions || 0)}%
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                                {selectedAd.clicks_count || 0} clicks / {selectedAd.total_impressions || 0} impressions
                            </p>
                        </div>
                    </div>

                    {/* Auction Performance */}
                    <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={20} /> Auction Performance (Last 7 Days)
                        </h2>

                        {auctionLoading ? (
                            <FunLoader size="sm" />
                        ) : auctionData ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>Auctions Entered</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700 }}>{auctionData.summary.total_auctions}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>Auctions Won</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>{auctionData.summary.wins}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>Win Rate</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700 }}>{auctionData.summary.win_rate}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>Avg. Position</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700 }}>{auctionData.summary.avg_position}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>Avg. CPC</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700 }}>{auctionData.summary.avg_cpc}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>Total Charged</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700 }}>${auctionData.summary.total_charged}</p>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--color-muted)' }}>No auction data available yet. Your ad needs impressions to appear here.</p>
                        )}
                    </div>

                    {/* Position Breakdown */}
                    {auctionData && Object.keys(auctionData.positions).length > 0 && (
                        <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Feed Position Distribution</h2>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {Object.entries(auctionData.positions).map(([position, count]) => (
                                    <div key={position} style={{ textAlign: 'center', padding: '16px', background: 'var(--color-bg)', borderRadius: '8px', minWidth: '100px' }}>
                                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>Position {position}</p>
                                        <p style={{ fontSize: '24px', fontWeight: 700 }}>{count}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--color-muted)' }}>times</p>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '16px' }}>
                                Positions 1-3: Top of feed (QS 8+) | Positions 4-6: Above fold (QS 5-7) | Positions 7-12: Mid-feed | Positions 13-18: Lower feed
                            </p>
                        </div>
                    )}

                    {/* Recommendations */}
                    {auctionData && auctionData.recommendations.length > 0 && (
                        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF' }}>
                                <Info size={20} /> Optimization Recommendations
                            </h2>
                            <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
                                {auctionData.recommendations.map((rec, idx) => (
                                    <li key={idx} style={{ fontSize: '14px', color: '#1E3A8A', marginBottom: '8px', lineHeight: 1.5 }}>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Budget Status */}
                    <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', marginTop: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Budget Status</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Total Budget</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                        ${selectedAd.total_spend?.toFixed(2) || '0.00'} / ${selectedAd.total_budget > 0 ? '$' + selectedAd.total_budget : 'Unlimited'}
                                    </span>
                                </div>
                                {selectedAd.total_budget > 0 && (
                                    <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div 
                                            style={{ 
                                                height: '100%', 
                                                background: (selectedAd.total_spend / selectedAd.total_budget) > 0.8 ? '#EF4444' : '#3B82F6',
                                                width: `${Math.min(100, ((selectedAd.total_spend || 0) / selectedAd.total_budget) * 100)}%`,
                                                transition: 'width 0.3s ease'
                                            }} 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* QS Breakdown Info */}
                    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', marginTop: '32px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} /> How Quality Score Works
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Expected CTR (40%)</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Based on historical click-through rate. 2% CTR = 4.0 points.</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Relevance Score (30%)</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>How well your ad matches user interests and search intent.</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Landing Page (15%)</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Load speed, mobile-friendliness, and bounce rate.</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Engagement Rate (15%)</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Saves, shares, and comments on your sponsored pins.</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '16px', fontStyle: 'italic' }}>
                            Your Ad Rank = Effective Bid × Quality Score. Higher rank = better position and lower actual CPC.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
