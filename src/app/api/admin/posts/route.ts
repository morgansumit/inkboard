import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// POST /api/admin/posts - Create a new post as admin with country selection
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            title, 
            subtitle, 
            content, 
            cover_image_url, 
            tags,
            country_code,
            author_id 
        } = body;

        // Validate required fields
        if (!title || !content || !cover_image_url) {
            return NextResponse.json({ 
                error: 'Title, content, and cover image are required' 
            }, { status: 400 });
        }

        const now = new Date().toISOString();
        const id = crypto.randomUUID();

        // Create post in Supabase
        const dbPost = {
            id,
            title,
            subtitle: subtitle || '',
            content: { html: content },
            cover_image_url,
            cover_aspect_ratio: '4:3',
            author_id: author_id || null, // Can be null for admin-created content
            status: 'PUBLISHED',
            read_time_minutes: Math.ceil(content.split(' ').length / 200) || 1,
            engagement_score: 0,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            is_trending: false,
            source_platform: 'admin', // Mark as admin-created
            source_url: null,
            country_code: country_code || null, // Country selection for geo-targeting
            created_at: now,
            published_at: now,
            updated_at: now,
        };

        const { error } = await supabaseAdmin.from('posts').insert(dbPost);

        if (error) {
            console.error('[admin/posts] Failed to create post:', error);
            return NextResponse.json({ 
                error: 'Failed to create post: ' + error.message 
            }, { status: 500 });
        }

        // Handle tags if provided
        if (tags && Array.isArray(tags) && tags.length > 0) {
            for (const tagName of tags) {
                // Find or create tag
                const { data: existingTag } = await supabaseAdmin
                    .from('tags')
                    .select('id')
                    .eq('name', tagName.toLowerCase())
                    .maybeSingle();

                let tagId;
                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    const { data: newTag, error: tagError } = await supabaseAdmin
                        .from('tags')
                        .insert({ name: tagName.toLowerCase(), slug: tagName.toLowerCase().replace(/\s+/g, '-') })
                        .select('id')
                        .single();
                    
                    if (tagError) {
                        console.error('[admin/posts] Failed to create tag:', tagError);
                        continue;
                    }
                    tagId = newTag?.id;
                }

                // Link tag to post
                if (tagId) {
                    try {
                        await supabaseAdmin
                            .from('post_tags')
                            .insert({ post_id: id, tag_id: tagId });
                    } catch (err: any) {
                        console.error('[admin/posts] Failed to link tag:', err);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            post: {
                id,
                title,
                country_code,
                created_at: now,
            }
        });

    } catch (err: any) {
        console.error('[admin/posts] Error:', err);
        return NextResponse.json({ 
            error: 'Failed to create post: ' + err.message 
        }, { status: 500 });
    }
}

// GET /api/admin/posts - List all admin-created posts
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const country = searchParams.get('country');

        let query = supabaseAdmin
            .from('posts')
            .select('*, users(id, username, display_name)')
            .eq('source_platform', 'admin');

        if (country) {
            query = query.eq('country_code', country);
        }

        const { data: posts, error } = await query
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
        }

        return NextResponse.json({ posts: posts || [] });
    } catch (err) {
        console.error('[admin/posts] Error:', err);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}
