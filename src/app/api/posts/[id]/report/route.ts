import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const VALID_REASONS = [
    'spam',
    'nudity_sexual',
    'hate_speech',
    'harassment_bullying',
    'violence',
    'false_information',
    'intellectual_property',
    'scam_fraud',
    'self_harm',
    'other',
] as const;

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: postId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await req.json();
        const { reason, details } = body as { reason: string; details?: string };

        if (!reason || !VALID_REASONS.includes(reason as any)) {
            return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 });
        }

        // Verify post exists
        const { data: post } = await supabaseAdmin
            .from('posts')
            .select('id, author_id')
            .eq('id', postId)
            .maybeSingle();

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Don't allow reporting own post
        if (post.author_id === user.id) {
            return NextResponse.json({ error: 'Cannot report your own post' }, { status: 400 });
        }

        // Check for duplicate report
        const { data: existing } = await supabaseAdmin
            .from('reports')
            .select('id')
            .eq('reporter_id', user.id)
            .eq('content_id', postId)
            .eq('content_type', 'POST')
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'You have already reported this post' }, { status: 409 });
        }

        // Insert report
        const reportData: Record<string, string> = {
            reporter_id: user.id,
            content_type: 'POST',
            content_id: postId,
            reason,
            status: 'PENDING',
        };
        // Store user details in resolution_note field if provided
        if (details?.trim()) reportData.resolution_note = `User note: ${details.trim()}`;

        const { error: insertError } = await supabaseAdmin
            .from('reports')
            .insert(reportData);

        if (insertError) {
            console.error('[report] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Report submitted successfully' });
    } catch (err) {
        console.error('[report] Error:', err);
        return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }
}
