import type { Metadata } from 'next';
import './globals.css';
import { Playfair_Display, Merriweather, Inter, JetBrains_Mono } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Footer } from '@/components/Footer';
import { SupabaseErrorHandler } from '@/components/SupabaseErrorHandler';
import { BroadcastNotifications } from '@/components/BroadcastNotifications';
import { createClient } from '@/lib/supabase/server';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
  preload: true,
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-merriweather',
  display: 'swap',
  preload: false,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
});

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
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${merriweather.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
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
