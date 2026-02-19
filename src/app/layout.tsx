import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: 'PrefTracker — Preferred Stock Dashboard',
  description: 'Internal preferred stock tracking and AI trade idea dashboard',
  robots: 'noindex,nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <TooltipProvider>
          <Navbar />
          <main className="container mx-auto px-4 py-4 max-w-[1600px]">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
