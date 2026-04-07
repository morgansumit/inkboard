import { NextResponse } from 'next/server';
import { getCountryFromRequest } from '@/lib/geo';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '032646f0-6694-414c-af5e-e39acf1ae2c0';
    const steps: string[] = [];

    try {
        steps.push('1. Starting');

        // Step 1: Create anon client
        const { createAnonClient } = await import('@/lib/supabase/anon');
        const supabase = createAnonClient();
        steps.push('2. Anon client created: ' + (supabase ? 'yes' : 'null'));

        if (!supabase) {
            return NextResponse.json({ error: 'No anon client', steps });
        }

        // Step 2: Fetch post
        const { data: rawPost, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey(id, username, display_name, bio, avatar_url, location, role, is_verified, is_business, created_at, follower_count, following_count)
            `)
            .eq('id', id)
            .maybeSingle();

        steps.push('3. Post fetched: ' + (rawPost ? rawPost.title : 'null') + ', error: ' + (error ? error.message : 'none'));

        if (!rawPost) {
            return NextResponse.json({ error: 'Post not found', steps });
        }

        steps.push('4. Post country_code: ' + (rawPost.country_code || 'null'));

        // Step 3: Geo check
        if (rawPost.country_code) {
            let viewerCountry: string | null = null;
            let geoAuthUser: any = null;

            try {
                const authClient = await createClient();
                steps.push('5. Auth client created');
                const { data: { user: authUser } } = await authClient.auth.getUser();
                geoAuthUser = authUser;
                steps.push('6. Auth user: ' + (authUser?.id || 'null'));

                if (authUser?.user_metadata?.country_code) {
                    viewerCountry = authUser.user_metadata.country_code;
                    steps.push('7. Country from metadata: ' + viewerCountry);
                } else {
                    viewerCountry = await getCountryFromRequest();
                    steps.push('7. Country from IP: ' + (viewerCountry || 'null'));
                }
            } catch (err: any) {
                steps.push('5-ERR. Auth error: ' + err.message);
                viewerCountry = await getCountryFromRequest();
                steps.push('6. Fallback country: ' + (viewerCountry || 'null'));
            }

            const isPostAuthor = geoAuthUser?.id === rawPost.author_id;
            steps.push('8. isPostAuthor: ' + isPostAuthor + ', viewerCountry: ' + viewerCountry + ', postCountry: ' + rawPost.country_code);
        }

        // Step 4: Fetch tags
        const { data: postTags, error: tagsError } = await supabase
            .from('post_tags')
            .select('tags(id, name)')
            .eq('post_id', id);

        steps.push('9. Tags fetched: ' + (postTags?.length || 0) + ', error: ' + (tagsError ? tagsError.message : 'none'));

        // Step 5: Follow check
        try {
            const authClient2 = await createClient();
            const { data: { user: user2 } } = await authClient2.auth.getUser();
            steps.push('10. Follow check user: ' + (user2?.id || 'null'));
        } catch (err: any) {
            steps.push('10-ERR. Follow check error: ' + err.message);
        }

        steps.push('11. DONE - All steps passed');
        return NextResponse.json({ success: true, steps, post: { id: rawPost.id, title: rawPost.title, country_code: rawPost.country_code } });

    } catch (err: any) {
        steps.push('FATAL: ' + err.message + ' | ' + err.stack?.slice(0, 500));
        return NextResponse.json({ error: err.message, steps }, { status: 500 });
    }
}
