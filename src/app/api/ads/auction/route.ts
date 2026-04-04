import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCountryFromRequest } from '@/lib/geo'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { 
        feedSessionId = crypto.randomUUID(),
        availableSlots = 4,
        page = 1 
    } = body

    try {
        // Detect viewer's country for geo-targeted ads
        const viewerCountry = await getCountryFromRequest()

        // Run the auction
        const { data: auctionResults, error: auctionError } = await supabaseAdmin.rpc('run_ad_auction', {
            p_user_id: user.id,
            p_available_slots: availableSlots,
            p_feed_session_id: feedSessionId,
            p_viewer_country: viewerCountry
        })

        if (auctionError) {
            console.error('[auction] error running auction:', auctionError)
            return NextResponse.json({ error: auctionError.message }, { status: 500 })
        }

        // For each winning ad, record the auction win and charge
        const winningAds = []
        const charges = []

        // Record auction wins and charge from wallet
        for (const win of auctionResults) {
            try {
                // Try to charge from wallet first
                const walletCharged = await supabaseAdmin.rpc('charge_wallet_for_ad', {
                    p_user_id: win.user_id,
                    p_amount: win.actual_cpc,
                    p_ad_id: win.ad_id,
                    p_description: `Ad auction win - Position ${win.position}`
                });

                if (!walletCharged) {
                    // Fallback to regular spend tracking if wallet fails
                    await supabaseAdmin.rpc('record_auction_win', {
                        p_ad_id: win.ad_id,
                        p_user_id: win.user_id,
                        p_position: win.position,
                        p_ad_rank: win.ad_rank,
                        p_actual_cpc: win.actual_cpc,
                        p_effective_bid: win.effective_bid,
                        p_quality_score: win.quality_score,
                        p_feed_session_id: feedSessionId
                    });
                }

                // Fetch full ad details
                const { data: adData } = await supabaseAdmin
                    .from('ads')
                    .select('id, title, description, target_url, image_url, image_urls, status, max_cpc, quality_score, total_spend, total_budget, category')
                    .eq('id', win.ad_id)
                    .single()

                if (adData) {
                    winningAds.push({
                        ...adData,
                        position: win.position,
                        ad_rank: win.ad_rank,
                        actual_cpc: win.actual_cpc,
                        effective_bid: win.effective_bid,
                        charged_amount: win.actual_cpc,
                        is_starter_boost: win.is_starter_boost || false
                    })
                }

                charges.push({
                    ad_id: win.ad_id,
                    charged: win.actual_cpc,
                    position: win.position
                })
            } catch (recordError) {
                console.error('[auction] error recording win for ad', win.ad_id, recordError)
            }
        }

        return NextResponse.json({
            success: true,
            feed_session_id: feedSessionId,
            winning_ads: winningAds,
            auction_summary: {
                total_slots: availableSlots,
                filled_slots: winningAds.length,
                total_charged: charges.reduce((sum, c) => sum + (c.charged || 0), 0)
            }
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Auction failed'
        console.error('[auction] unexpected error:', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// Get auction history for an advertiser
export async function GET(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const adId = searchParams.get('adId')
    const days = parseInt(searchParams.get('days') || '7', 10)

    try {
        // Verify user owns the ad or is admin
        const { data: ad, error: adError } = await supabaseAdmin
            .from('ads')
            .select('user_id')
            .eq('id', adId)
            .single()

        if (adError || !ad) {
            return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = profile?.role === 'ADMIN'
        const isOwner = ad.user_id === user.id

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get auction results
        const { data: auctions, error: auctionError } = await supabaseAdmin
            .from('ad_auction_results')
            .select('*')
            .eq('ad_id', adId)
            .gte('auction_timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .order('auction_timestamp', { ascending: false })

        if (auctionError) {
            return NextResponse.json({ error: auctionError.message }, { status: 500 })
        }

        // Get feed position stats
        const { data: positions } = await supabaseAdmin
            .from('ad_auction_results')
            .select('position_achieved, count')
            .eq('ad_id', adId)
            .gte('auction_timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .not('position_achieved', 'is', null)

        const positionBreakdown = positions?.reduce((acc, p) => {
            acc[p.position_achieved] = (acc[p.position_achieved] || 0) + 1
            return acc
        }, {} as Record<number, number>) || {}

        // Calculate metrics
        const totalAuctions = auctions?.length || 0
        const wins = auctions?.filter(a => a.won_auction).length || 0
        const winRate = totalAuctions > 0 ? (wins / totalAuctions * 100).toFixed(1) : '0'
        
        const avgCPC = auctions?.filter(a => a.won_auction).length > 0
            ? (auctions.filter(a => a.won_auction).reduce((sum, a) => sum + (a.actual_cpc_charged || 0), 0) / auctions.filter(a => a.won_auction).length).toFixed(2)
            : '0'

        const avgPosition = auctions?.filter(a => a.position_achieved).length > 0
            ? (auctions.filter(a => a.position_achieved).reduce((sum, a) => sum + (a.position_achieved || 0), 0) / auctions.filter(a => a.position_achieved).length).toFixed(1)
            : '0'

        return NextResponse.json({
            success: true,
            ad_id: adId,
            days,
            summary: {
                total_auctions: totalAuctions,
                wins,
                win_rate: `${winRate}%`,
                avg_cpc: `$${avgCPC}`,
                avg_position: avgPosition,
                total_charged: auctions?.filter(a => a.won_auction).reduce((sum, a) => sum + (a.actual_cpc_charged || 0), 0).toFixed(2) || '0'
            },
            position_breakdown: positionBreakdown,
            recent_auctions: (auctions || []).slice(0, 50),
            recommendations: generateRecommendations(auctions || [])
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch auction data'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

function generateRecommendations(auctions: any[]): string[] {
    const recommendations: string[] = []
    
    if (auctions.length === 0) {
        recommendations.push('No auction data yet. Your ad will start appearing once it gains quality score.')
        return recommendations
    }

    const wins = auctions.filter(a => a.won_auction)
    const winRate = wins.length / auctions.length

    if (winRate < 0.3) {
        recommendations.push('Low win rate detected. Try increasing your max CPC bid or improving your Quality Score.')
    }

    const avgPosition = wins.length > 0 
        ? wins.reduce((sum, a) => sum + (a.position_achieved || 0), 0) / wins.length 
        : 0

    if (avgPosition > 10) {
        recommendations.push('Your ads are appearing lower in the feed. Higher bids or better targeting may improve visibility.')
    }

    const avgQS = auctions.reduce((sum, a) => sum + (a.quality_score || 5), 0) / auctions.length
    if (avgQS < 5) {
        recommendations.push('Quality Score is below average. Focus on improving expected CTR and relevance.')
    }

    if (recommendations.length === 0) {
        recommendations.push('Your ad performance is healthy. Continue monitoring to maintain results.')
    }

    return recommendations
}
