import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ADMIN_CONSOLE_CACHE_TTL_MS, adminConsoleCache, invalidateAdminConsoleCache } from '@/lib/admin/consoleCache'

export const runtime = 'nodejs'

type DbTag = { id: string; name: string }

type DbPost = {
    id: string
    title: string
    status: string
    like_count: number | null
    comment_count: number | null
    is_trending: boolean | null
    cover_image_url?: string | null
    created_at?: string
    country_code?: string | null
    source_platform?: string | null
    users?: { display_name?: string | null; username?: string | null } | null
    post_tags?: { tags?: DbTag | DbTag[] | null }[] | null
}

type DbUser = {
    id: string
    username?: string | null
    display_name?: string | null
    email?: string | null
    avatar_url?: string | null
    role?: string | null
    is_verified?: boolean | null
    created_at?: string
}

type DbBusinessRequest = {
    id: string
    user_id: string
    business_name?: string | null
    website_url?: string | null
    description?: string | null
    status?: string | null
    created_at?: string
    users?: { display_name?: string | null; email?: string | null } | null
}

type DbAd = {
    id: string
    title?: string | null
    target_url?: string | null
    image_url?: string | null
    status?: string | null
    daily_budget?: number | null
    total_budget?: number | null
    created_at?: string
}

type DbReport = {
    id?: string
    reason?: string | null
    type?: string | null
    status?: string | null
    created_at?: string | null
    [key: string]: unknown
}

type DbGeoLog = {
    id?: string
    ip_hash?: string | null
    ip?: string | null
    country?: string | null
    path?: string | null
    url?: string | null
    created_at?: string | null
    time?: string | null
    [key: string]: unknown
}

type AdminConsoleData = {
    posts: DbPost[]
    users: DbUser[]
    businessRequests: DbBusinessRequest[]
    ads: DbAd[]
    reports: DbReport[]
    geoLogs: DbGeoLog[]
}

function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message
    if (typeof err === 'string') return err
    return 'Failed to load admin data'
}

async function refreshCache(): Promise<AdminConsoleData> {
    const [postsRes, usersRes, businessRes, adsRes] = await Promise.all([
        supabaseAdmin
            .from('posts')
            .select(`
                id, title, status, is_trending, cover_image_url, created_at, country_code, source_platform,
                users!author_id(display_name, username),
                post_tags(tags(id, name))
            `)
            .order('created_at', { ascending: false })
            .limit(200),
        supabaseAdmin
            .from('users')
            .select('id, username, display_name, email, avatar_url, role, is_verified, created_at')
            .order('created_at', { ascending: false })
            .limit(200),
        supabaseAdmin
            .from('business_requests')
            .select('id, user_id, business_name, website_url, description, status, created_at, users:users!business_requests_user_id_fkey(display_name, email)')
            .order('created_at', { ascending: false })
            .limit(200),
        supabaseAdmin
            .from('ads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200),
    ])

    if (postsRes.error) throw postsRes.error
    if (usersRes.error) throw usersRes.error
    if (businessRes.error) throw businessRes.error
    if (adsRes.error) throw adsRes.error

    // Fetch real-time like and comment counts from separate tables
    const postIds = (postsRes.data ?? []).map(p => p.id)
    
    let likeCounts: Record<string, number> = {}
    let commentCounts: Record<string, number> = {}
    
    if (postIds.length > 0) {
        // Batch fetch like counts for all posts
        const { data: likesData, error: likesError } = await supabaseAdmin
            .from('post_likes')
            .select('post_id')
            .in('post_id', postIds)
        
        if (!likesError && likesData) {
            likeCounts = likesData.reduce((acc, like) => {
                acc[like.post_id] = (acc[like.post_id] || 0) + 1
                return acc
            }, {} as Record<string, number>)
        }
        
        // Batch fetch comment counts for all posts
        const { data: commentsData, error: commentsError } = await supabaseAdmin
            .from('post_comments')
            .select('post_id')
            .in('post_id', postIds)
        
        if (!commentsError && commentsData) {
            commentCounts = commentsData.reduce((acc, comment) => {
                acc[comment.post_id] = (acc[comment.post_id] || 0) + 1
                return acc
            }, {} as Record<string, number>)
        }
    }

    // Merge real-time counts into posts
    const postsWithRealCounts = (postsRes.data ?? []).map(post => ({
        ...post,
        like_count: likeCounts[post.id] || 0,
        comment_count: commentCounts[post.id] || 0,
    }))

    const reportsRes = await supabaseAdmin
        .from('reports')
        .select('id, reporter_id, content_type, content_id, reason, status, created_at, resolution_note')
        .order('created_at', { ascending: false })
        .limit(200)

    let geoLogsRes = await supabaseAdmin
        .from('geo_block_logs')
        .select('*')
        .order('time', { ascending: false })
        .limit(200)

    if (geoLogsRes.error) {
        geoLogsRes = await supabaseAdmin
            .from('geo_block_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
    }

    return {
        posts: postsWithRealCounts as DbPost[],
        users: (usersRes.data ?? []) as DbUser[],
        businessRequests: (businessRes.data ?? []) as DbBusinessRequest[],
        ads: (adsRes.data ?? []) as DbAd[],
        reports: (reportsRes.error ? [] : ((reportsRes.data ?? []) as DbReport[])),
        geoLogs: (geoLogsRes.error ? [] : ((geoLogsRes.data ?? []) as DbGeoLog[])),
    }
}

export async function GET(req: Request) {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
        return NextResponse.json({ error: 'Unable to verify admin role' }, { status: 500 })
    }

    if (profile?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ?bust=1 forces a full cache invalidation (e.g. after deleting posts)
    const bust = new URL(req.url).searchParams.has('bust')
    if (bust) {
        invalidateAdminConsoleCache()
    }

    const now = Date.now()
    const isFresh = adminConsoleCache.data && now - adminConsoleCache.updatedAt < ADMIN_CONSOLE_CACHE_TTL_MS

    if (isFresh) {
        return NextResponse.json({
            ...adminConsoleCache.data,
            cachedAt: new Date(adminConsoleCache.updatedAt).toISOString(),
            stale: false,
        })
    }

    // Serve stale data immediately and refresh in the background.
    if (adminConsoleCache.data && !adminConsoleCache.refreshing) {
        adminConsoleCache.refreshing = true
        void refreshCache()
            .then(data => {
                adminConsoleCache.data = data
                adminConsoleCache.updatedAt = Date.now()
            })
            .catch(err => {
                console.error('[admin.console-data] background refresh failed', err)
            })
            .finally(() => {
                adminConsoleCache.refreshing = false
            })

        return NextResponse.json({
            ...adminConsoleCache.data,
            cachedAt: new Date(adminConsoleCache.updatedAt).toISOString(),
            stale: true,
        })
    }

    if (adminConsoleCache.refreshing && adminConsoleCache.data) {
        return NextResponse.json({
            ...adminConsoleCache.data,
            cachedAt: new Date(adminConsoleCache.updatedAt).toISOString(),
            stale: true,
        })
    }

    adminConsoleCache.refreshing = true

    try {
        const data = await refreshCache()
        adminConsoleCache.data = data
        adminConsoleCache.updatedAt = Date.now()
        return NextResponse.json({
            ...data,
            cachedAt: new Date(adminConsoleCache.updatedAt).toISOString(),
            stale: false,
        })
    } catch (err: unknown) {
        if (adminConsoleCache.data) {
            return NextResponse.json({
                ...adminConsoleCache.data,
                cachedAt: new Date(adminConsoleCache.updatedAt).toISOString(),
                stale: true,
                warning: getErrorMessage(err) || 'Refresh failed; serving cached data',
            })
        }
        // No cache and refresh failed: serve a minimal skeleton so the UI appears immediately
        const fallback: AdminConsoleData = {
            posts: [],
            users: [],
            businessRequests: [],
            ads: [],
            reports: [],
            geoLogs: [],
        }
        return NextResponse.json({
            ...fallback,
            cachedAt: null,
            stale: true,
            warning: getErrorMessage(err) || 'Initial load failed; showing empty view',
        })
    } finally {
        adminConsoleCache.refreshing = false
    }
}
