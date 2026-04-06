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

// GET /api/admin/policies
export async function GET() {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data, error } = await supabaseAdmin.from('policies').select('*').order('sort_order', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ policies: data || [] });
}

// POST /api/admin/policies
export async function POST(req: Request) {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { data: existing } = await supabaseAdmin.from('policies').select('id').eq('slug', body.slug).maybeSingle();
        if (existing) return NextResponse.json({ error: 'Policy with this slug already exists' }, { status: 400 });

        const { data: countData } = await supabaseAdmin.from('policies').select('id', { count: 'exact', head: true });
        const { data, error } = await supabaseAdmin.from('policies').insert({
            slug: body.slug,
            title: body.title,
            description: body.description || '',
            content: body.content || '',
            is_published: body.isPublished ?? false,
            sort_order: (countData as any)?.length || 0,
            last_updated: new Date().toISOString(),
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err) {
        console.error('[admin/policies] POST error:', err);
        return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
    }
}

// PATCH /api/admin/policies
export async function PATCH(req: Request) {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { id, ...fields } = body;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        if (fields.slug) {
            const { data: existing } = await supabaseAdmin.from('policies').select('id').eq('slug', fields.slug).neq('id', id).maybeSingle();
            if (existing) return NextResponse.json({ error: 'Policy with this slug already exists' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin.from('policies')
            .update({ ...fields, last_updated: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err) {
        console.error('[admin/policies] PATCH error:', err);
        return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
    }
}

// DELETE /api/admin/policies
export async function DELETE(req: Request) {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const { error } = await supabaseAdmin.from('policies').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[admin/policies] DELETE error:', err);
        return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
    }
}
