import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// POST /api/coupons/click - Track coupon click
export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        await supabaseAdmin.rpc('increment_coupon_clicks', { coupon_id: id });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to track click:', err);
        return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
    }
}
