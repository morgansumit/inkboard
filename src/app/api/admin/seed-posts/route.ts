import { NextResponse } from 'next/server';
import { MOCK_POSTS } from '@/lib/mockData';
import { createAnonClient } from '@/lib/supabase/anon';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const supabase = createAnonClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Failed to create Supabase client' }, { status: 500 });
        }

        const results = {
            inserted: 0,
            skipped: 0,
            errors: [] as string[]
        };

        for (const post of MOCK_POSTS) {
            // Check if post already exists
            const { data: existing } = await supabase
                .from('posts')
                .select('id')
                .eq('id', post.id)
                .maybeSingle();

            if (existing) {
                results.skipped++;
                continue;
            }

            // Insert post
            const { error } = await supabase.from('posts').insert({
                id: post.id,
                title: post.title,
                subtitle: post.subtitle || '',
                content: { html: post.content },
                cover_image_url: post.cover_image_url,
                cover_aspect_ratio: post.cover_aspect_ratio || '16:9',
                author_id: null,
                status: 'PUBLISHED',
                read_time_minutes: post.read_time_minutes || 1,
                engagement_score: post.engagement_score || 0,
                like_count: post.like_count || 0,
                comment_count: post.comment_count || 0,
                share_count: post.share_count || 0,
                is_trending: post.is_trending || false,
                source_platform: post.source || 'purseable',
                created_at: post.created_at,
                published_at: post.published_at,
                updated_at: post.published_at || post.created_at,
            });

            if (error) {
                results.errors.push(`Failed to insert ${post.id}: ${error.message}`);
            } else {
                results.inserted++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${results.inserted} posts, skipped ${results.skipped} existing`,
            errors: results.errors.length > 0 ? results.errors : undefined
        });

    } catch (err) {
        console.error('[seed-posts] Error:', err);
        return NextResponse.json({ 
            error: 'Failed to seed posts', 
            details: (err as Error).message 
        }, { status: 500 });
    }
}

// Also allow GET for easy testing
export async function GET() {
    return POST();
}
