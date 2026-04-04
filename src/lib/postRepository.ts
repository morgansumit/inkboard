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
    return id.replace(/\//g, '-');
}

// Fetch posts from Supabase when cache is unavailable
async function fetchFromSupabase(): Promise<Post[] | null> {
    try {
        // Use regular server client instead of admin - posts are readable by all
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        
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
        
        if (!posts || posts.length === 0) {
            return null;
        }
        
        // Transform database posts to Post type
        return posts.map((p: any): Post => ({
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
            created_at: p.created_at,
            published_at: p.published_at,
            tags: [],
        }));
    } catch (err) {
        console.error('[postRepository] Failed to fetch from Supabase:', err);
        return null;
    }
}

async function readCacheFile(): Promise<Post[] | null> {
    // Skip filesystem operations in serverless environments
    if (process.env.NETLIFY === 'true' || process.env.VERCEL === '1') {
        // On Netlify, try memory cache first, then Supabase
        if (memoryCache && memoryCache.length > 0) {
            return memoryCache;
        }
        // Try to fetch from Supabase
        const fromDb = await fetchFromSupabase();
        if (fromDb && fromDb.length > 0) {
            memoryCache = fromDb;
            return fromDb;
        }
        return null;
    }
    
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

        const all = await this.getAll();
        return all.find(p => normalizeIdForMatch(p.id) === normalizedId);
    },
};
