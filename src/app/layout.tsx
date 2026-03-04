import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  metadataBase: new URL('https://inkboard-writing.vercel.app'), // Replace with your actual domain later
  title: {
    default: 'Inkboard — Discover Writing You Love',
    template: '%s | Inkboard',
  },
  description:
    'Inkboard is a visually-driven social platform for writers, bloggers, and readers across Europe. Discover rich, long-form content in a beautiful masonry feed.',
  keywords: ['writing', 'blogging', 'literature', 'reading', 'Europe', 'content discovery'],
  openGraph: {
    type: 'website',
    siteName: 'Inkboard',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div style={{ display: 'flex', minHeight: '100svh', width: '100%' }}>
          <Sidebar />
          <div className="layout-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Navbar />
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
