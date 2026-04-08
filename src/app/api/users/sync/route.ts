import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateUniqueUsername } from '@/lib/admin/setup'

function initialsAvatar(name: string) {
    const seed = encodeURIComponent(name || 'centsably User')
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
}

async function detectCountryFromRequest(req: Request): Promise<string | null> {
    try {
        // Get client IP from headers
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
        
        if (!ip) return null;
        
        const ipRes = await fetch(`https://ipinfo.io/${ip}/json`);
        const ipData = await ipRes.json();
        return ipData.country || null;
    } catch (err) {
        console.error('[users.sync] Could not detect country:', err);
        return null;
    }
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

    // Detect and store country_code for OAuth users if not already set
    if (!user.user_metadata?.country_code) {
        const detectedCountry = await detectCountryFromRequest(req);
        if (detectedCountry) {
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
                user_metadata: {
                    ...user.user_metadata,
                    country_code: detectedCountry,
                },
            });
        }
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
        return NextResponse.json({ synced: true, id: existing.id })
    }

    const usernameSeed = (user.email?.split('@')[0] || user.user_metadata?.username || 'centsably').toLowerCase()
    const username = await generateUniqueUsername(usernameSeed)

    const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || usernameSeed
    const avatar_url = user.user_metadata?.avatar_url || initialsAvatar(displayName)

    // Get metadata fields
    const country_code = user.user_metadata?.country_code || null;
    const ip_address = user.user_metadata?.ip_address || null;
    const location = user.user_metadata?.location || null;
    const age_range = user.user_metadata?.age_range || null;
    const income_level = user.user_metadata?.income_level || 'Medium';
    const os_family = user.user_metadata?.os_family || 'Unknown';
    const device_type = user.user_metadata?.device_type || 'Desktop';

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
