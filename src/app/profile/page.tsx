import { MOCK_USERS } from '@/lib/mockData';
import { postRepository } from '@/lib/postRepository';
import { ProfileClient } from '../u/[username]/ProfileClient';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types';

export const runtime = 'nodejs';

function buildUserFromEmail(email: string): User {
    const username = email.split('@')[0];
    return {
        id: `self-${username}`,
        email,
        username,
        display_name: username,
        bio: '',
        avatar_url: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`,
        location: '',
        role: 'USER',
        is_verified: false,
        is_suspended: false,
        is_business: false,
        created_at: new Date().toISOString(),
        follower_count: 0,
        following_count: 0,
        total_likes: 0,
        post_count: 0,
    };
}

export default async function SelfProfilePage() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user?.email;

    const user = email
        ? buildUserFromEmail(email)
        : (MOCK_USERS.find(u => u.username === 'elise_page') ?? buildUserFromEmail('guest@example.com'));

    const allPosts = await postRepository.getAll();
    const posts = allPosts.filter(p => p.author_id === user.id && p.status === 'PUBLISHED' && !p.source);

    return <ProfileClient user={user} posts={posts} likedPosts={[]} />;
}
