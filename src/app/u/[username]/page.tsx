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
    
    if (!user) return { title: 'User Not Found | purseable' };
    
    return {
        title: `${user.display_name} (@${username}) | purseable`,
        description: user.bio,
        openGraph: { images: [user.avatar_url ?? ''] },
    };
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    const viewerCountry = await getCountryFromRequest();
    
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name, bio, avatar_url, location, follower_count, following_count, is_verified, is_business, created_at')
        .eq('username', username)
        .single();
    
    if (!user) {
        return <div>User not found</div>;
    }
    
    const isOwnProfile = currentUserId === user.id;
    
    const posts = await fetchUserPosts(user.id, { countryCode: viewerCountry ?? undefined, isOwnProfile });

    // Fetch liked posts from Supabase
    let likedPosts: any[] = [];
    if (currentUserId) {
        const { data: likedIds } = await supabaseAdmin
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .limit(6);
        if (likedIds && likedIds.length > 0) {
            const { data: liked } = await supabaseAdmin
                .from('posts')
                .select('*')
                .in('id', likedIds.map((l: { post_id: string }) => l.post_id))
                .eq('status', 'PUBLISHED');
            likedPosts = liked || [];
        }
    }

    // Check if current user follows this profile user
    let isFollowing = false;
    if (currentUserId && !isOwnProfile) {
        const { data: followData } = await supabaseAdmin
            .from('follows')
            .select('follower_id')
            .eq('follower_id', currentUserId)
            .eq('following_id', user.id)
            .maybeSingle();
        isFollowing = !!followData;
    }
    
    return <ProfileClient user={user} posts={posts || []} likedPosts={likedPosts} isOwnProfile={isOwnProfile} isFollowing={isFollowing} />;
}
