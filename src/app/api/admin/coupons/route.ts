import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function checkAdmin(): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
    return profile?.role === 'ADMIN';
}

// GET /api/admin/coupons
export async function GET() {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data, error } = await supabaseAdmin.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ coupons: data || [] });
}

// POST /api/admin/coupons
export async function POST(req: Request) {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { data, error } = await supabaseAdmin.from('coupons').insert({
            title: body.title,
            description: body.description || '',
            code: (body.code || '').toUpperCase(),
            discount: body.discount,
            brand: body.brand,
            brand_logo: body.brandLogo || '',
            cover_image: body.coverImage || '',
            target_url: body.targetUrl,
            category: body.category || 'Other',
            expires_at: body.expiresAt || null,
            is_active: body.isActive ?? true,
            clicks: 0,
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err) {
        console.error('[admin/coupons] POST error:', err);
        return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
    }
}

// PATCH /api/admin/coupons
export async function PATCH(req: Request) {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { id, ...fields } = body;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const { data, error } = await supabaseAdmin.from('coupons').update(fields).eq('id', id).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err) {
        console.error('[admin/coupons] PATCH error:', err);
        return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
    }
}

// DELETE /api/admin/coupons
export async function DELETE(req: Request) {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const { error } = await supabaseAdmin.from('coupons').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[admin/coupons] DELETE error:', err);
        return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
    }
}
