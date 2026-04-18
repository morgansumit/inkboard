import { MasonryFeed } from '@/components/MasonryFeed';
import type { Metadata } from 'next';

// Static page — no cookies/session read server-side.
// Auth is detected client-side via localStorage cache + onAuthStateChange,
// which means this page can be CDN-cached and served at <50ms TTFB worldwide.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'centsably — Discover Writing You Love',
  description: 'Discover beautifully written stories, essays, and blog posts from Europe\'s most talented writers on centsably.',
};

export default function HomePage() {
  return (
    <div style={{ paddingTop: '0px' }}>
      <MasonryFeed />
    </div>
  );
}
