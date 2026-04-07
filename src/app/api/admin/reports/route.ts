import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// PATCH - Resolve or dismiss a report
export async function PATCH(req: Request) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, action } = await req.json();

    if (!id || !['resolve', 'dismiss'].includes(action)) {
        return NextResponse.json({ error: 'id and action (resolve|dismiss) required' }, { status: 400 });
    }

    const newStatus = action === 'resolve' ? 'RESOLVED' : 'DISMISSED';

    const { error: updateError } = await supabaseAdmin
        .from('reports')
        .update({
            status: newStatus,
            moderator_id: user.id,
            resolved_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (updateError) {
        console.error('[admin/reports] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: newStatus });
}
