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

async function readCacheFile(): Promise<Post[] | null> {
    // Skip filesystem operations in serverless environments
    if (process.env.NETLIFY === 'true' || process.env.VERCEL === '1') {
        return memoryCache;
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
