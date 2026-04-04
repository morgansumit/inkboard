import { NextResponse } from 'next/server';
import { postRepository } from '@/lib/postRepository';
import type { Post, Tag, User } from '@/types';
import { MOCK_USERS } from '@/lib/mockData';
import crypto from 'crypto';
import { createAnonClient } from '@/lib/supabase/anon';
import { getCountryFromRequest } from '@/lib/geo';

export const runtime = 'nodejs';

type CreatePostBody = {
    title: string;
    subtitle?: string;
    content: string;
    cover_image_url: string;
    video_url?: string;
    cover_aspect_ratio?: Post['cover_aspect_ratio'];
    tags: string[];
};

function toTag(name: string): Tag {
    const clean = name.toLowerCase().trim();
    return { id: clean, name: clean, post_count: 1 };
}

function computeReadTimeMinutes(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ');
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

function getDemoAuthor(): User {
    return MOCK_USERS[2] ?? MOCK_USERS[0];
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<CreatePostBody>;

        if (!body.title || !body.content || !body.cover_image_url || !Array.isArray(body.tags) || body.tags.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const author = getDemoAuthor();
        // Use UUID without user- prefix for database compatibility
        const id = crypto.randomUUID();

        const post: Post = {
            id,
            author_id: author.id,
            author,
            title: body.title,
            subtitle: body.subtitle || '',
            content: body.content,
            cover_image_url: body.cover_image_url,
            cover_aspect_ratio: body.cover_aspect_ratio || '4:3',
            status: 'PUBLISHED',
            read_time_minutes: computeReadTimeMinutes(body.content),
            engagement_score: 0,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            is_trending: false,
            is_liked: false,
            video_url: body.video_url || null,
            tags: body.tags.map(toTag),
            created_at: now,
            published_at: now,
        };

        // Detect poster's country from IP for geoblocking
        const countryCode = await getCountryFromRequest();
        console.log('[posts] Detected country:', countryCode);

        // Save to Supabase database (not just cache)
        const supabase = createAnonClient();
        if (supabase) {
            const { error: dbError } = await supabase.from('posts').insert({
                id: post.id,
                title: post.title,
                subtitle: post.subtitle,
                content: { html: post.content },
                cover_image_url: post.cover_image_url,
                video_url: body.video_url || null,
                cover_aspect_ratio: post.cover_aspect_ratio,
                author_id: null, // User posts don't have real author in auth.users
                status: 'PUBLISHED',
                read_time_minutes: post.read_time_minutes,
                engagement_score: 0,
                like_count: 0,
                comment_count: 0,
                share_count: 0,
                is_trending: false,
                source_platform: 'user',
                country_code: countryCode,
                created_at: now,
                published_at: now,
                updated_at: now,
            });
            
            if (dbError) {
                console.error('[posts] Failed to save to Supabase:', dbError);
                // Continue to save to cache as fallback
            }
        }

        // Also save to local cache for immediate availability
        await postRepository.upsertMany([post]);

        return NextResponse.json({ post });
    } catch (err) {
        console.error('[posts] Error creating post:', err);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}
