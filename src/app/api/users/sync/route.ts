import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateUniqueUsername } from '@/lib/admin/setup'

function initialsAvatar(name: string) {
    const seed = encodeURIComponent(name || 'centsably User')
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
}

type GeoInfo = {
    ip: string | null;
    country_code: string | null;
    location: string | null;  // "City, CC"
};

async function detectGeoFromReq(req: Request): Promise<GeoInfo> {
    const empty: GeoInfo = { ip: null, country_code: null, location: null };
    try {
        const h = req.headers;

        // 1. Country: use Netlify's x-country header (most reliable)
        let country_code: string | null = null;
        const xCountry = h.get('x-country') || h.get('x-nf-country');
        if (xCountry && xCountry.length === 2) {
            country_code = xCountry.toUpperCase();
        }

        // 2. IP: use x-forwarded-for first entry (real client IP), NOT x-nf-client-connection-ip (Netlify proxy)
        const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
            || h.get('x-real-ip')
            || null;

        // 3. If no country from header, try ipinfo fallback
        let location: string | null = null;
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
            try {
                const ipRes = await fetch(`https://ipinfo.io/${ip}/json`, {
                    signal: AbortSignal.timeout(2000),
                });
                if (ipRes.ok) {
                    const d = await ipRes.json();
                    if (!country_code && d.country) country_code = d.country.toUpperCase();
                    if (d.city && d.country) location = `${d.city}, ${d.country}`;
                }
            } catch { /* ipinfo failed */ }
        }

        return { ip, country_code, location };
    } catch (err) {
        console.error('[users.sync] Geo detection failed:', err);
        return empty;
    }
}

function detectDevice(req: Request): { os_family: string; device_type: string } {
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    let os_family = 'Unknown';
    if (ua.includes('windows')) os_family = 'Windows';
    else if (ua.includes('mac os') || ua.includes('macintosh')) os_family = 'macOS';
    else if (ua.includes('linux') && !ua.includes('android')) os_family = 'Linux';
    else if (ua.includes('android')) os_family = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os_family = 'iOS';

    let device_type = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) device_type = 'Mobile';
    else if (ua.includes('tablet') || ua.includes('ipad')) device_type = 'Tablet';

    return { os_family, device_type };
}

export async function POST(req: Request) {
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

    // Detect geo + device info and store in user_metadata
    const geo = await detectGeoFromReq(req);
    const device = detectDevice(req);
    const metaUpdates: Record<string, string> = {};
    if (geo.country_code && user.user_metadata?.country_code !== geo.country_code) metaUpdates.country_code = geo.country_code;
    if (geo.ip && !user.user_metadata?.ip_address) metaUpdates.ip_address = geo.ip;
    if (geo.location && !user.user_metadata?.location) metaUpdates.location = geo.location;
    if (!user.user_metadata?.os_family || user.user_metadata.os_family === 'Unknown') metaUpdates.os_family = device.os_family;
    if (!user.user_metadata?.device_type) metaUpdates.device_type = device.device_type;

    if (Object.keys(metaUpdates).length > 0) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, ...metaUpdates },
        });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

    if (fetchError) {
        console.error('[users.sync] fetch error', fetchError)
        return NextResponse.json({ error: 'Failed to check profile' }, { status: 500 })
    }

    if (existing?.id) {
        // Backfill or correct geo/device data for existing users
        const { data: existingRow, error: existingRowErr } = await supabaseAdmin
            .from('users')
            .select('country_code, ip_address, location, os_family, device_type')
            .eq('id', user.id)
            .single();

        const updates: Record<string, string> = {};
        // Always update country_code if we have a reliable detection (from Netlify x-country header)
        if (geo.country_code && existingRow?.country_code !== geo.country_code) updates.country_code = geo.country_code;
        if (geo.ip && !existingRow?.ip_address) updates.ip_address = geo.ip;
        // Update location if we have fresh data and it differs
        if (geo.location && existingRow?.location !== geo.location) updates.location = geo.location;
        if ((!existingRow?.os_family || existingRow.os_family === 'Unknown') && device.os_family !== 'Unknown') updates.os_family = device.os_family;
        if (!existingRow?.device_type && device.device_type) updates.device_type = device.device_type;

        if (Object.keys(updates).length > 0) {
            await supabaseAdmin.from('users').update(updates).eq('id', user.id);
        }

        return NextResponse.json({ synced: true, id: existing.id })
    }

    const usernameSeed = (user.email?.split('@')[0] || user.user_metadata?.username || 'centsably').toLowerCase()
    const username = await generateUniqueUsername(usernameSeed)

    const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || usernameSeed
    const avatar_url = user.user_metadata?.avatar_url || initialsAvatar(displayName)

    // Merge freshly detected data with any existing metadata
    const country_code = geo.country_code || user.user_metadata?.country_code || null;
    const ip_address = geo.ip || user.user_metadata?.ip_address || null;
    const location = geo.location || user.user_metadata?.location || null;
    const age_range = user.user_metadata?.age_range || null;
    const income_level = user.user_metadata?.income_level || 'Medium';
    const os_family = device.os_family || user.user_metadata?.os_family || 'Unknown';
    const device_type = device.device_type || user.user_metadata?.device_type || 'Desktop';

    const profilePayload = {
        id: user.id,
        email: user.email,
        username,
        display_name: displayName,
        avatar_url,
        role: 'USER',
        is_verified: false,
        is_business: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        country_code,
        ip_address,
        location,
        age_range,
        income_level,
        os_family,
        device_type,
    }

    const { error: insertError, data } = await supabaseAdmin
        .from('users')
        .insert(profilePayload)
        .select('id')
        .single()

    if (insertError) {
        console.error('[users.sync] insert error', insertError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ synced: true, id: data.id }, { status: 201 })
}
