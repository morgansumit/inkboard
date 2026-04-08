import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';

export const runtime = 'nodejs';

// Helper to replace centsably with centsably in policy content
function transformPolicy(policy: any) {
    if (!policy) return policy;
    return {
        ...policy,
        title: policy.title?.replace(/centsably/gi, 'centsably'),
        content: policy.content?.replace(/centsably/gi, 'centsably'),
        description: policy.description?.replace(/centsably/gi, 'centsably'),
    };
}

// GET /api/policies - Public endpoint for published policies
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');

        const supabase = createAnonClient();
        if (!supabase) return NextResponse.json({ policies: [] });

        if (slug) {
            const { data, error } = await supabase
                .from('policies')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();
            if (error || !data) return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
            return NextResponse.json({ policy: transformPolicy(data) });
        }

        const { data, error } = await supabase
            .from('policies')
            .select('*')
            .eq('is_published', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('[policies] fetch error:', error);
            return NextResponse.json({ policies: [] });
        }

        return NextResponse.json({ policies: (data || []).map(transformPolicy) });
    } catch (err) {
        console.error('Failed to fetch policies:', err);
        return NextResponse.json({ policies: [] });
    }
}
