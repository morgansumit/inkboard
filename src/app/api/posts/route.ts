import { NextResponse } from 'next/server';
import type { Post, Tag, User } from '@/types';
import crypto from 'crypto';
import { createAnonClient } from '@/lib/supabase/anon';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

async function getAuthenticatedAuthor(): Promise<{ user: User; authId: string } | null> {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return null;

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('id, username, display_name, bio, avatar_url, role, is_verified, is_business, created_at, follower_count, following_count')
            .eq('id', authUser.id)
            .maybeSingle();

        if (profile) {
            return {
                authId: authUser.id,
                user: {
                    id: profile.id,
                    username: profile.username,
                    display_name: profile.display_name || profile.username,
                    bio: profile.bio || '',
                    avatar_url: profile.avatar_url,
                    role: profile.role,
                    is_verified: profile.is_verified,
                    is_business: profile.is_business,
                    created_at: profile.created_at,
                    follower_count: profile.follower_count || 0,
                    following_count: profile.following_count || 0,
                },
            };
        }

        // No profile row yet — build a minimal author from auth metadata
        const email = authUser.email || 'unknown';
        const username = email.split('@')[0];
        return {
            authId: authUser.id,
            user: {
                id: authUser.id,
                username,
                display_name: authUser.user_metadata?.display_name || username,
                avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
                created_at: new Date().toISOString(),
            },
        };
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<CreatePostBody>;

        if (!body.title || !body.content || !body.cover_image_url || !Array.isArray(body.tags) || body.tags.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Require authentication - no fallback to mock users
        const authenticated = await getAuthenticatedAuthor();
        if (!authenticated) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const now = new Date().toISOString();
        const author = authenticated.user;
        const authorId = authenticated.authId;
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

        // Save to Supabase database ONLY (not cache) for real user posts
        const supabase = createAnonClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }
        
        const { error: dbError } = await supabase.from('posts').insert({
            id: post.id,
            title: post.title,
            subtitle: post.subtitle,
            content: { html: post.content },
            cover_image_url: post.cover_image_url,
            video_url: body.video_url || null,
            cover_aspect_ratio: post.cover_aspect_ratio,
            author_id: authorId,
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
            return NextResponse.json({ error: 'Failed to save post to database' }, { status: 500 });
        }

        return NextResponse.json({ post });
    } catch (err) {
        console.error('[posts] Error creating post:', err);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}
