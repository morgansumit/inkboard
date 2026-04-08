import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCountryFromRequest } from '@/lib/geo';
import { fetchUserPosts } from '@/lib/posts';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
    const { username } = await params;
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('display_name, bio, avatar_url')
        .eq('username', username)
        .single();
    
    if (!user) return { title: 'User Not Found | centsably' };
    
    return {
        title: `${user.display_name} (@${username}) | centsably`,
        description: user.bio,
        openGraph: { images: [user.avatar_url ?? ''] },
    };
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;

    // Round 1: session + user profile + country in parallel
    const supabase = await createClient();
    const [{ data: { session } }, { data: user }, viewerCountry] = await Promise.all([
        supabase.auth.getSession(),
        supabaseAdmin
            .from('users')
            .select('id, username, display_name, bio, avatar_url, location, follower_count, following_count, is_verified, is_business, created_at')
            .eq('username', username)
            .single(),
        getCountryFromRequest(),
    ]);

    if (!user) {
        return <div>User not found</div>;
    }

    const currentUserId = session?.user?.id;
    const isOwnProfile = currentUserId === user.id;

    // Round 2: posts + liked IDs + follow status all in parallel
    const [posts, likedIdsResult, followResult] = await Promise.all([
        fetchUserPosts(user.id, { countryCode: viewerCountry ?? undefined, isOwnProfile }),
        currentUserId
            ? supabaseAdmin.from('post_likes').select('post_id').eq('user_id', user.id).limit(6)
            : Promise.resolve({ data: null }),
        currentUserId && !isOwnProfile
            ? supabaseAdmin.from('follows').select('follower_id').eq('follower_id', currentUserId).eq('following_id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
    ]);

    const isFollowing = !!followResult.data;

    // Round 3: liked post details (depends on likedIds)
    let likedPosts: any[] = [];
    const likedIds = likedIdsResult.data;
    if (likedIds && likedIds.length > 0) {
        const { data: liked } = await supabaseAdmin
            .from('posts')
            .select('*')
            .in('id', likedIds.map((l: { post_id: string }) => l.post_id))
            .eq('status', 'PUBLISHED');
        likedPosts = liked || [];
    }

    return <ProfileClient user={user} posts={posts || []} likedPosts={likedPosts} isOwnProfile={isOwnProfile} isFollowing={isFollowing} />;
}
