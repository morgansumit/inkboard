import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';

export const runtime = 'nodejs';

// GET /api/coupons - Public endpoint for active coupons
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        const supabase = createAnonClient();
        if (!supabase) return NextResponse.json({ coupons: [] });

        let query = supabase
            .from('coupons')
            .select('*')
            .eq('is_active', true)
            .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
            .order('created_at', { ascending: false });

        if (category && category !== 'All') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[coupons] fetch error:', error);
            return NextResponse.json({ coupons: [] });
        }

        return NextResponse.json({ coupons: data || [] });
    } catch (err) {
        console.error('Failed to fetch coupons:', err);
        return NextResponse.json({ coupons: [] });
    }
}
