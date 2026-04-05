import { NextResponse } from 'next/server';
import { contentIngestionService } from '@/content-ingestion/content-ingestion.service';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { postRepository } from '@/lib/postRepository';
import type { Post } from '@/types';

export const runtime = 'nodejs';

// POST /api/admin/ingest-content - Manually trigger content ingestion
export async function POST(req: Request) {
    try {
        // Check admin authorization
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        
        // Simple secret check (should be more secure in production)
        if (secret !== process.env.ADMIN_SECRET && secret !== 'dev-secret') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { source, limit = 20 } = body;

        let posts: Post[] = [];

        if (source === 'devto' || !source) {
            const devtoPosts = await contentIngestionService.fetchDevTo();
            posts = [...posts, ...devtoPosts];
        }

        if (source === 'hashnode' || !source) {
            const hashnodePosts = await contentIngestionService.fetchHashnode();
            posts = [...posts, ...hashnodePosts];
        }

        if (source === 'wikinews' || !source) {
            const wikinewsPosts = await contentIngestionService.fetchWikinews();
            posts = [...posts, ...wikinewsPosts];
        }

        if (source === 'guardian' || !source) {
            const guardianPosts = await contentIngestionService.fetchGuardian();
            posts = [...posts, ...guardianPosts];
        }

        // Save to cache
        await postRepository.upsertMany(posts);

        // Seed to Supabase
        const results = await seedPostsToSupabase(posts);

        return NextResponse.json({
            success: true,
            fetched: posts.length,
            seeded: results.success,
            failed: results.failed,
            errors: results.errors,
        });
    } catch (err) {
        console.error('[ingest-content] Error:', err);
        return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 });
    }
}

// GET /api/admin/ingest-content - Get ingestion status
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        
        if (secret !== process.env.ADMIN_SECRET && secret !== 'dev-secret') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get counts
        const cachedPosts = await postRepository.getAll();
        
        const { data: dbPosts, error } = await supabaseAdmin
            .from('posts')
            .select('id, source_platform', { count: 'exact', head: true });

        if (error) {
            return NextResponse.json({ error: 'Failed to query database' }, { status: 500 });
        }

        return NextResponse.json({
            cachedPosts: cachedPosts.length,
            databasePosts: dbPosts?.length || 0,
            sources: {
                devto: cachedPosts.filter(p => p.source === 'devto').length,
                hashnode: cachedPosts.filter(p => p.source === 'hashnode').length,
                wikinews: cachedPosts.filter(p => p.source === 'wikinews').length,
                guardian: cachedPosts.filter(p => p.source === 'guardian').length,
                user: cachedPosts.filter(p => p.author_id && p.source !== 'devto' && p.source !== 'hashnode' && p.source !== 'wikinews' && p.source !== 'guardian').length,
            }
        });
    } catch (err) {
        console.error('[ingest-content] Error:', err);
        return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
    }
}

// Helper function to seed posts to Supabase
async function seedPostsToSupabase(posts: Post[]) {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const post of posts) {
        try {
            // Check if post already exists
            const { data: existing } = await supabaseAdmin
                .from('posts')
                .select('id')
                .eq('id', post.id)
                .maybeSingle();

            if (existing) {
                continue; // Skip existing posts
            }

            // Transform post to database format
            const dbPost = {
                id: post.id,
                title: post.title,
                subtitle: post.subtitle || '',
                content: { html: post.content },
                cover_image_url: post.cover_image_url,
                cover_aspect_ratio: post.cover_aspect_ratio || '16:9',
                author_id: null, // Content ingestion posts have no real author
                status: 'PUBLISHED',
                read_time_minutes: post.read_time_minutes || 1,
                engagement_score: post.engagement_score || 0,
                like_count: post.like_count || 0,
                comment_count: post.comment_count || 0,
                share_count: post.share_count || 0,
                is_trending: post.is_trending || false,
                source_platform: post.source || 'purseable',
                source_url: post.source_url,
                country_code: post.country_code || null,
                created_at: post.created_at,
                published_at: post.published_at || post.created_at,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabaseAdmin.from('posts').insert(dbPost);

            if (error) {
                results.failed++;
                results.errors.push(`Failed to insert ${post.id}: ${error.message}`);
            } else {
                results.success++;
            }
        } catch (err: any) {
            results.failed++;
            results.errors.push(`Exception for ${post.id}: ${err.message}`);
        }
    }

    return results;
}
