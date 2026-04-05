import type { Post } from '@/types';
import { MOCK_POSTS } from '@/lib/mockData';

type PostStoreState = {
    posts: Post[];
};

function getState(): PostStoreState {
    const g = globalThis as unknown as { __purseable_post_store__?: PostStoreState };
    if (!g.__purseable_post_store__) {
        g.__purseable_post_store__ = { posts: [...MOCK_POSTS] };
    }
    return g.__purseable_post_store__;
}

function stripCycleSuffix(id: string): string {
    const idx = id.indexOf('-cycle-');
    return idx === -1 ? id : id.slice(0, idx);
}

function normalizeIdForMatch(id: string): string {
    return id.replace(/\//g, '-');
}

export const postStore = {
    getAll(): Post[] {
        return getState().posts;
    },

    addMany(posts: Post[]): number {
        const state = getState();
        let added = 0;

        for (const post of posts) {
            const alreadyExists = state.posts.find(p => (post.source_url && p.source_url === post.source_url) || p.id === post.id);
            if (alreadyExists) continue;

            state.posts.unshift(post);
            added++;
        }

        return added;
    },

    findById(id: string): Post | undefined {
        const baseId = stripCycleSuffix(id);

        const exact = getState().posts.find(p => p.id === baseId);
        if (exact) return exact;

        const normalizedBaseId = normalizeIdForMatch(baseId);
        return getState().posts.find(p => normalizeIdForMatch(p.id) === normalizedBaseId);
    },
};
