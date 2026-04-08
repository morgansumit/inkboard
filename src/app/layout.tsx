import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Footer } from '@/components/Footer';
import { SupabaseErrorHandler } from '@/components/SupabaseErrorHandler';
import { BroadcastNotifications } from '@/components/BroadcastNotifications';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL('https://centsably.com'),
  title: {
    default: 'Centsably — Discover Writing You Love',
    template: '%s | Centsably',
  },
  description:
    'Centsably is a visually-driven social platform for writers, bloggers, and readers across Europe. Discover rich, long-form content in a beautiful masonry feed.',
  keywords: ['writing', 'blogging', 'literature', 'reading', 'Europe', 'content discovery'],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Centsably',
    images: ['/og-image.png'],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log('[Layout] Session:', session?.user?.id || 'null', 'Error:', sessionError?.message || 'none');
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SupabaseErrorHandler />
        <BroadcastNotifications />
        <div style={{ display: 'flex', minHeight: '100svh', width: '100%' }}>
          <Sidebar initialSession={session} />
          <div className="layout-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Navbar initialSession={session} />
            <main>{children}</main>
          </div>
        </div>
        <Footer />
      </body>
    </html>
  );
}
