// ─── Core Types ───────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    location?: string;
    role: 'USER' | 'MODERATOR' | 'ADMIN';
    is_verified: boolean;
    is_suspended: boolean;
    is_business: boolean;
    created_at: string;
    follower_count: number;
    following_count: number;
    total_likes: number;
    post_count: number;
}

export interface Post {
    id: string;
    author_id: string;
    author: User;
    title: string;
    subtitle?: string;
    content?: string;
    cover_image_url: string;
    cover_aspect_ratio: '3:4' | '2:3' | '9:16' | '4:3' | '16:9' | '1:1';
    status: 'DRAFT' | 'PUBLISHED' | 'REMOVED';
    read_time_minutes: number;
    engagement_score: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    is_trending: boolean;
    is_liked?: boolean;
    tags: Tag[];
    created_at: string;
    published_at?: string;
    source_url?: string;
    source?: 'devto' | 'hashnode' | 'guardian' | 'wikinews';
}

export interface Tag {
    id: string;
    name: string;
    post_count: number;
}

export interface Interest {
    id: string;
    name: string;
    icon: string;
    category: string;
}

export interface Comment {
    id: string;
    post_id: string;
    author: User;
    parent_comment_id?: string;
    content: string;
    is_hidden: boolean;
    created_at: string;
    replies?: Comment[];
}

export interface Notification {
    id: string;
    type: 'LIKE' | 'COMMENT' | 'REPLY' | 'FOLLOW' | 'TRENDING';
    actor: User;
    entity_type: 'POST' | 'COMMENT';
    entity_id: string;
    is_read: boolean;
    created_at: string;
    post_title?: string;
    post_id?: string;
    content_snippet?: string;
}

export interface Report {
    id: string;
    reporter: User;
    content_type: 'POST' | 'COMMENT';
    content_id: string;
    reason: string;
    status: 'PENDING' | 'RESOLVED';
    created_at: string;
}

// ─── Aspect Ratio helpers ─────────────────────────────────
export const ASPECT_RATIO_MAP: Record<Post['cover_aspect_ratio'], number> = {
    '3:4': 4 / 3,
    '2:3': 3 / 2,
    '9:16': 16 / 9,
    '4:3': 3 / 4,
    '16:9': 9 / 16,
    '1:1': 1,
};

// paddingBottom % = (h/w) * 100
export const ASPECT_RATIO_PADDING: Record<Post['cover_aspect_ratio'], string> = {
    '3:4': '133.3%',
    '2:3': '150%',
    '9:16': '177.8%',
    '4:3': '75%',
    '16:9': '56.25%',
    '1:1': '100%',
};
