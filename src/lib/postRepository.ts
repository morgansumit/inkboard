import type { Post } from '@/types';
import { MOCK_POSTS } from '@/lib/mockData';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.inkboard-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'posts.json');

// In-memory fallback for serverless environments where fs isn't available
let memoryCache: Post[] | null = null;

function stripCycleSuffix(id: string): string {
    const idx = id.indexOf('-cycle-');
    return idx === -1 ? id : id.slice(0, idx);
}

function normalizeIdForMatch(id: string): string {
    // Strip source prefixes and replace slashes with dashes
    // Matches: hashnode-xxx, devto-xxx, wikinews-xxx, guardian-xxx, user-xxx
    return id.replace(/^(hashnode-|devto-|wikinews-|guardian-|user-)/, '').replace(/\//g, '-');
}

// Fetch posts from Supabase when cache is unavailable
async function fetchFromSupabase(): Promise<Post[] | null> {
    try {
        console.log('[fetchFromSupabase] Starting...');
        console.log('[fetchFromSupabase] NETLIFY env:', process.env.NETLIFY);
        console.log('[fetchFromSupabase] VERCEL env:', process.env.VERCEL);
        
        // Use anon client for public data - doesn't require cookies
        const { createAnonClient } = await import('@/lib/supabase/anon');
        const supabase = createAnonClient();
        
        if (!supabase) {
            console.error('[postRepository] Failed to create anon client - check env vars');
            return null;
        }
        
        console.log('[fetchFromSupabase] Anon client created');
        
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('status', 'PUBLISHED')
            .order('published_at', { ascending: false })
            .limit(100);
        
        if (error) {
            console.error('[postRepository] Supabase fetch error:', error);
            return null;
        }
        
        console.log('[fetchFromSupabase] Fetched', posts?.length || 0, 'posts');
        
        if (!posts || posts.length === 0) {
            return null;
        }
        
        return posts.map(transformDbPost);
    } catch (err) {
        console.error('[postRepository] Failed to fetch from Supabase:', err);
        return null;
    }
}

async function readCacheFile(): Promise<Post[] | null> {
    const isServerless = process.env.NETLIFY === 'true' || process.env.VERCEL === '1';
    
    if (isServerless) {
        // On Netlify/Vercel: use memory cache (ephemeral filesystem)
        return memoryCache;
    }
    
    // Local dev: read from filesystem cache (like deployed site)
    try {
        const raw = await fs.readFile(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed as Post[];
    } catch {
        return null;
    }
}

async function writeCacheFile(posts: Post[]): Promise<void> {
    // Use memory cache in serverless environments
    if (process.env.NETLIFY === 'true' || process.env.VERCEL === '1') {
        memoryCache = posts;
        return;
    }
    
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(CACHE_FILE, JSON.stringify(posts), 'utf8');
    } catch {
        // Fallback to memory if fs fails
        memoryCache = posts;
    }
}

function transformDbPost(p: any): Post {
    return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        content: typeof p.content === 'string'
            ? p.content
            : p.content?.html || p.content?.text || JSON.stringify(p.content) || '',
        cover_image_url: p.cover_image_url,
        cover_aspect_ratio: p.cover_aspect_ratio || '16:9',
        author_id: p.author_id || 'system',
        author: {
            id: p.author_id || 'system',
            email: 'system@inkboard.local',
            username: 'system',
            display_name: p.source_platform || 'Inkboard',
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${p.source_platform || 'Inkboard'}`,
            bio: '',
            location: '',
            role: 'USER',
            is_verified: true,
            is_suspended: false,
            is_business: false,
            created_at: p.created_at,
            follower_count: 0,
            following_count: 0,
            total_likes: 0,
            post_count: 0,
        },
        status: p.status,
        read_time_minutes: p.read_time_minutes || 1,
        engagement_score: p.engagement_score || 0,
        like_count: p.like_count || 0,
        comment_count: p.comment_count || 0,
        share_count: p.share_count || 0,
        is_trending: p.is_trending || false,
        source: p.source_platform || 'inkboard',
        source_url: p.source_url,
        country_code: p.country_code || null,
        created_at: p.created_at,
        published_at: p.published_at,
        tags: [],
    };
}

export const postRepository = {
    async getAll(): Promise<Post[]> {
        const cached = await readCacheFile();
        if (cached && cached.length > 0) return cached;
        return [...MOCK_POSTS];
    },

    async upsertMany(newPosts: Post[]): Promise<number> {
        if (!newPosts || newPosts.length === 0) return 0;

        const existing = await this.getAll();
        const next = [...existing];

        let added = 0;
        for (const post of newPosts) {
            const normalized = { ...post, id: normalizeIdForMatch(post.id) };
            const alreadyExists = next.find(p => (normalized.source_url && p.source_url === normalized.source_url) || p.id === normalized.id);
            if (alreadyExists) continue;
            next.unshift(normalized);
            added++;
        }

        await writeCacheFile(next);
        return added;
    },

    async findById(id: string): Promise<Post | undefined> {
        const baseId = stripCycleSuffix(id);
        const normalizedId = normalizeIdForMatch(baseId);
        
        console.log('[findById] id:', id, 'normalized:', normalizedId);

        // Try cache/Supabase list first
        try {
            const all = await this.getAll();
            console.log('[findById] getAll returned', all.length, 'posts');
            
            // Try exact match on normalized IDs
            const found = all.find(p => normalizeIdForMatch(p.id) === normalizedId);
            if (found) {
                console.log('[findById] Found by normalized match');
                return found;
            }
            
            // Try exact match on raw ID
            const foundRaw = all.find(p => p.id === id || p.id === baseId);
            if (foundRaw) {
                console.log('[findById] Found by raw match');
                return foundRaw;
            }
        } catch (err) {
            console.error('[findById] getAll error:', err);
        }
        
        // Direct Supabase lookup - only if normalizedId looks like a valid UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedId);
        
        if (isUUID) {
            console.log('[findById] Trying Supabase UUID lookup:', normalizedId);
            try {
                const { createAnonClient } = await import('@/lib/supabase/anon');
                const supabase = createAnonClient();
                if (supabase) {
                    const { data: post, error } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('id', normalizedId)
                        .maybeSingle();
                    
                    if (error) {
                        console.error('[findById] Supabase UUID lookup error:', error);
                    } else if (post) {
                        console.log('[findById] Found in Supabase by UUID');
                        return transformDbPost(post);
                    }
                }
            } catch (err) {
                console.error('[findById] Supabase lookup error:', err);
            }
        } else {
            console.log('[findById] Not a UUID, skipping direct DB lookup:', normalizedId);
        }
        
        console.log('[findById] Post not found for id:', id);
        return undefined;
    },
};
