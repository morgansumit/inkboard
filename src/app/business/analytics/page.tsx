'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FunLoader } from '@/components/FunLoader';
import Link from 'next/link';
import { 
    BarChart3, 
    TrendingUp, 
    TrendingDown,
    DollarSign, 
    MousePointer, 
    Eye, 
    MapPin, 
    Smartphone, 
    Users,
    Calendar,
    Filter,
    Download,
    ChevronDown,
    Target,
    Award,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';

interface Ad {
    id: string;
    title: string;
    status: string;
    created_at: string;
}

interface Summary {
    totalImpressions: number;
    totalClicks: number;
    totalSpend: number;
    avgCtr: string;
    avgCpc: string;
}

interface TimeSeriesPoint {
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
}

interface GeoData {
    location: string;
    clicks: number;
    impressions: number;
}

interface DeviceData {
    device: string;
    os: string;
    clicks: number;
    impressions: number;
}

interface AuctionInsights {
    avgPosition: string;
    avgQualityScore: string;
    positionDistribution: Record<number, number>;
}

interface AnalyticsData {
    success: boolean;
    ads: Ad[];
    summary: Summary | null;
    timeSeries: TimeSeriesPoint[];
    geography: GeoData[];
    devices: DeviceData[];
    demographics: Record<string, { count: number; avgScore: number }>;
    auctionInsights: AuctionInsights;
    dateRange: { start: string; end: string };
}

type DateRange = '7d' | '30d' | '90d' | 'custom';

export default function BusinessAnalyticsDashboard() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AnalyticsData | null>(null);
    
    // Filters
    const [selectedAdId, setSelectedAdId] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [metricFilter, setMetricFilter] = useState<'all' | 'impressions' | 'clicks' | 'spend'>('all');
    
    // UI states
    const [showFilters, setShowFilters] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = async () => {
        setRefreshing(true);
        try {
            let url = '/api/business/ads/analytics?';
            
            if (selectedAdId !== 'all') {
                url += `adId=${selectedAdId}&`;
            }
            
            if (dateRange === 'custom') {
                if (customStartDate && customEndDate) {
                    url += `startDate=${customStartDate}&endDate=${customEndDate}`;
                } else {
                    url += 'days=30';
                }
            } else {
                const daysMap: Record<Exclude<DateRange, 'custom'>, number> = { '7d': 7, '30d': 30, '90d': 90 };
                const presetRange = dateRange as Exclude<DateRange, 'custom'>;
                const days = daysMap[presetRange];
                url += `days=${days}`;
            }
            
            const res = await fetch(url);
            const result = await res.json();
            
            if (result.success) {
                setData(result);
                setError(null);
            } else {
                setError(result.error || 'Failed to load analytics');
            }
        } catch (err) {
            setError('Failed to fetch analytics data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [selectedAdId, dateRange, customStartDate, customEndDate]);

    // Export data as CSV
    const exportCSV = () => {
        if (!data) return;
        
        const rows = [
            ['Date', 'Impressions', 'Clicks', 'Spend', 'CTR'],
            ...data.timeSeries.map(day => [
                day.date,
                day.impressions,
                day.clicks,
                day.spend.toFixed(2),
                day.impressions > 0 ? ((day.clicks / day.impressions) * 100).toFixed(2) + '%' : '0%'
            ])
        ];
        
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ad-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Calculate trends
    const trends = useMemo(() => {
        if (!data?.timeSeries || data.timeSeries.length < 2) return null;
        
        const half = Math.floor(data.timeSeries.length / 2);
        const firstHalf = data.timeSeries.slice(0, half);
        const secondHalf = data.timeSeries.slice(half);
        
        const firstClicks = firstHalf.reduce((s, d) => s + d.clicks, 0);
        const secondClicks = secondHalf.reduce((s, d) => s + d.clicks, 0);
        
        const clickTrend = firstClicks > 0 
            ? ((secondClicks - firstClicks) / firstClicks) * 100 
            : 0;
            
        return { clickTrend };
    }, [data?.timeSeries]);

    if (loading) {
        return (
            <FunLoader />
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
                <p>{error}</p>
                <button onClick={fetchAnalytics} className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Retry
                </button>
            </div>
        );
    }

    if (!data?.ads?.length) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-muted)' }}>No ads found. Create an ad to see analytics.</p>
                <Link href="/ads/create" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
                    Create Ad
                </Link>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <Link href="/ads" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-muted)', textDecoration: 'none', marginBottom: '8px' }}>
                        <ArrowLeft size={14} /> Back to Ads Manager
                    </Link>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700 }}>
                        Business Analytics Center
                    </h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                        Track performance, demographics, and geographic insights
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Filter size={18} />
                        Filters
                        <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    <button 
                        onClick={exportCSV}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                    <button 
                        onClick={fetchAnalytics}
                        disabled={refreshing}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div style={{ 
                    background: 'var(--color-surface)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)',
                    marginBottom: '32px'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        {/* Ad Selector */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-muted)' }}>
                                Select Ad
                            </label>
                            <select 
                                value={selectedAdId}
                                onChange={e => setSelectedAdId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="all">All Ads</option>
                                {data.ads.map(ad => (
                                    <option key={ad.id} value={ad.id}>{ad.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-muted)' }}>
                                Date Range
                            </label>
                            <select 
                                value={dateRange}
                                onChange={e => setDateRange(e.target.value as DateRange)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {dateRange === 'custom' && (
                            <>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-muted)' }}>
                                        Start Date
                                    </label>
                                    <input 
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-muted)' }}>
                                        End Date
                                    </label>
                                    <input 
                                        type="date"
                                        value={customEndDate}
                                        onChange={e => setCustomEndDate(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                    />
                                </div>
                            </>
                        )}

                        {/* Metric Filter */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-muted)' }}>
                                Highlight Metric
                            </label>
                            <select 
                                value={metricFilter}
                                onChange={e => setMetricFilter(e.target.value as any)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="all">All Metrics</option>
                                <option value="impressions">Impressions</option>
                                <option value="clicks">Clicks</option>
                                <option value="spend">Spend</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {data.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    {/* Impressions */}
                    <SummaryCard 
                        icon={<Eye size={20} color="#3B82F6" />}
                        title="Total Impressions"
                        value={data.summary.totalImpressions.toLocaleString()}
                        color="#3B82F6"
                        highlighted={metricFilter === 'impressions'}
                    />
                    
                    {/* Clicks */}
                    <SummaryCard 
                        icon={<MousePointer size={20} color="#10B981" />}
                        title="Total Clicks"
                        value={data.summary.totalClicks.toLocaleString()}
                        color="#10B981"
                        highlighted={metricFilter === 'clicks'}
                        trend={trends?.clickTrend}
                    />
                    
                    {/* CTR */}
                    <SummaryCard 
                        icon={<Target size={20} color="#8B5CF6" />}
                        title="Avg. CTR"
                        value={`${data.summary.avgCtr}%`}
                        color="#8B5CF6"
                    />
                    
                    {/* Spend */}
                    <SummaryCard 
                        icon={<DollarSign size={20} color="#EF4444" />}
                        title="Total Spend"
                        value={`$${data.summary.totalSpend.toFixed(2)}`}
                        color="#EF4444"
                        highlighted={metricFilter === 'spend'}
                    />
                    
                    {/* Avg CPC */}
                    <SummaryCard 
                        icon={<TrendingUp size={20} color="#F59E0B" />}
                        title="Avg. CPC"
                        value={`$${data.summary.avgCpc}`}
                        color="#F59E0B"
                    />
                    
                    {/* Auction Position */}
                    <SummaryCard 
                        icon={<Award size={20} color="#6366F1" />}
                        title="Avg. Position"
                        value={data.auctionInsights?.avgPosition || '0'}
                        subtitle={`QS: ${data.auctionInsights?.avgQualityScore || '5.0'}`}
                        color="#6366F1"
                    />
                </div>
            )}

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Time Series Chart */}
                <div style={{ 
                    gridColumn: 'span 2',
                    background: 'var(--color-surface)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={18} /> Performance Over Time
                    </h3>
                    
                    {data.timeSeries.length > 0 ? (
                        <TimeSeriesChart data={data.timeSeries} metricFilter={metricFilter} />
                    ) : (
                        <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '40px' }}>
                            No data available for selected time range
                        </p>
                    )}
                </div>

                {/* Geographic Data */}
                <div style={{ 
                    background: 'var(--color-surface)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={18} /> Top Locations
                    </h3>
                    
                    {data.geography.length > 0 ? (
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {data.geography.slice(0, 10).map((geo, idx) => (
                                <div key={geo.location} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: idx < data.geography.length - 1 ? '1px solid var(--color-border)' : 'none'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ 
                                            width: '24px', 
                                            height: '24px', 
                                            borderRadius: '50%', 
                                            background: idx < 3 ? '#3B82F6' : '#E5E7EB',
                                            color: idx < 3 ? 'white' : 'var(--color-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            fontWeight: 700
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <span style={{ fontSize: '14px' }}>{geo.location}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{geo.clicks} clicks</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{geo.impressions} views</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '20px' }}>
                            No geographic data available
                        </p>
                    )}
                </div>

                {/* Device Breakdown */}
                <div style={{ 
                    background: 'var(--color-surface)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Smartphone size={18} /> Device Breakdown
                    </h3>
                    
                    {data.devices.length > 0 ? (
                        <div>
                            {data.devices.map((device, idx) => (
                                <div key={idx} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: idx < data.devices.length - 1 ? '1px solid var(--color-border)' : 'none'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{device.device}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{device.os}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{device.clicks} clicks</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{device.impressions} views</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '20px' }}>
                            No device data available
                        </p>
                    )}
                </div>

                {/* Targeting Breakdown */}
                <div style={{ 
                    background: 'var(--color-surface)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Audience Match Types
                    </h3>
                    
                    {Object.keys(data.demographics).length > 0 ? (
                        <div>
                            {Object.entries(data.demographics).map(([type, stats], idx) => (
                                <div key={type} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: idx < Object.keys(data.demographics).length - 1 ? '1px solid var(--color-border)' : 'none'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{type.replace(/_/g, ' ')}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                                            Avg Score: {(stats.avgScore * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ 
                                        padding: '4px 12px', 
                                        borderRadius: '12px', 
                                        background: '#EEF2FF',
                                        color: '#4F46E5',
                                        fontSize: '13px',
                                        fontWeight: 600
                                    }}>
                                        {stats.count} matches
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '20px' }}>
                            No targeting data available
                        </p>
                    )}
                </div>

                {/* Position Distribution */}
                {Object.keys(data.auctionInsights.positionDistribution).length > 0 && (
                    <div style={{ 
                        background: 'var(--color-surface)', 
                        padding: '24px', 
                        borderRadius: '12px', 
                        border: '1px solid var(--color-border)'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Award size={18} /> Feed Position Distribution
                        </h3>
                        
                        <div>
                            {Object.entries(data.auctionInsights.positionDistribution)
                                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                .map(([position, count]) => (
                                    <div key={position} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '8px 0'
                                    }}>
                                        <div style={{ 
                                            width: '60px', 
                                            fontSize: '14px', 
                                            fontWeight: 600,
                                            color: parseInt(position) <= 3 ? '#10B981' : 
                                                   parseInt(position) <= 6 ? '#3B82F6' : 'var(--color-muted)'
                                        }}>
                                            Pos {position}
                                        </div>
                                        <div style={{ flex: 1, height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${Math.min(100, (count / Object.values(data.auctionInsights.positionDistribution).reduce((a, b) => a + b, 0)) * 100 * 3)}%`,
                                                height: '100%',
                                                background: parseInt(position) <= 3 ? '#10B981' : 
                                                            parseInt(position) <= 6 ? '#3B82F6' : '#9CA3AF',
                                                borderRadius: '4px'
                                            }} />
                                        </div>
                                        <div style={{ width: '40px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                                            {count}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                        
                        <div style={{ marginTop: '16px', padding: '12px', background: '#F3F4F6', borderRadius: '8px', fontSize: '12px', color: 'var(--color-muted)' }}>
                            <strong>Position Guide:</strong> 1-3 = Top of feed | 4-6 = Above fold | 7-12 = Mid-feed | 13+ = Lower
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    Data updates every 15 minutes. Last updated: {new Date().toLocaleString()}
                </p>
            </div>
        </div>
    );
}

// Sub-components
function SummaryCard({ 
    icon, 
    title, 
    value, 
    subtitle,
    color, 
    highlighted = false,
    trend
}: { 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    subtitle?: string;
    color: string; 
    highlighted?: boolean;
    trend?: number;
}) {
    return (
        <div style={{ 
            background: 'var(--color-surface)', 
            padding: '20px', 
            borderRadius: '12px', 
            border: highlighted ? `2px solid ${color}` : '1px solid var(--color-border)',
            boxShadow: highlighted ? `0 0 0 1px ${color}20` : 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                {icon}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)' }}>{title}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color }}>
                {value}
            </div>
            {subtitle && (
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    {subtitle}
                </div>
            )}
            {trend !== undefined && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontSize: '12px', 
                    color: trend >= 0 ? '#10B981' : '#EF4444',
                    marginTop: '8px'
                }}>
                    {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(trend).toFixed(1)}% vs previous period
                </div>
            )}
        </div>
    );
}

function TimeSeriesChart({ data, metricFilter }: { data: TimeSeriesPoint[]; metricFilter: string }) {
    const maxValue = Math.max(
        metricFilter === 'clicks' ? Math.max(...data.map(d => d.clicks)) :
        metricFilter === 'spend' ? Math.max(...data.map(d => d.spend)) :
        Math.max(...data.map(d => d.impressions))
    ) || 1;

    return (
        <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '20px 0' }}>
            {data.map((point, idx) => {
                const impressionHeight = (point.impressions / maxValue) * 100;
                const clickHeight = (point.clicks / maxValue) * 100;
                const spendHeight = (point.spend / maxValue) * 100;

                return (
                    <div key={point.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '200px' }}>
                            {/* Impressions Bar */}
                            {(metricFilter === 'all' || metricFilter === 'impressions') && (
                                <div 
                                    title={`${point.date}: ${point.impressions.toLocaleString()} impressions`}
                                    style={{ 
                                        width: metricFilter === 'impressions' ? 20 : 8, 
                                        height: `${impressionHeight}%`, 
                                        background: '#3B82F6',
                                        borderRadius: '2px 2px 0 0',
                                        opacity: metricFilter === 'impressions' ? 1 : 0.7,
                                        transition: 'height 0.3s ease'
                                    }} 
                                />
                            )}
                            
                            {/* Clicks Bar */}
                            {(metricFilter === 'all' || metricFilter === 'clicks') && (
                                <div 
                                    title={`${point.date}: ${point.clicks.toLocaleString()} clicks`}
                                    style={{ 
                                        width: metricFilter === 'clicks' ? 20 : 8, 
                                        height: `${clickHeight}%`, 
                                        background: '#10B981',
                                        borderRadius: '2px 2px 0 0',
                                        opacity: metricFilter === 'clicks' ? 1 : 0.7,
                                        transition: 'height 0.3s ease'
                                    }} 
                                />
                            )}
                            
                            {/* Spend Bar */}
                            {(metricFilter === 'all' || metricFilter === 'spend') && (
                                <div 
                                    title={`${point.date}: $${point.spend.toFixed(2)} spend`}
                                    style={{ 
                                        width: metricFilter === 'spend' ? 20 : 8, 
                                        height: `${spendHeight}%`, 
                                        background: '#EF4444',
                                        borderRadius: '2px 2px 0 0',
                                        opacity: metricFilter === 'spend' ? 1 : 0.7,
                                        transition: 'height 0.3s ease'
                                    }} 
                                />
                            )}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: '8px', whiteSpace: 'nowrap' }}>
                            {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
