import { MasonryFeed } from '@/components/MasonryFeed';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'centsably — Discover Writing You Love',
  description: 'Discover beautifully written stories, essays, and blog posts from Europe\'s most talented writers on centsably.',
};

export default async function HomePage() {
  // Re-use the session already fetched in RootLayout (same request, cached by Next.js)
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <div style={{ paddingTop: '24px' }}>
      <MasonryFeed isLoggedIn={!!session} />
    </div>
  );
}
