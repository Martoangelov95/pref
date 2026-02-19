'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/stocks', label: 'Dashboard' },
  { href: '/ideas', label: 'AI Ideas' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center gap-8">
        <Link href="/stocks" className="font-semibold text-base tracking-tight">
          PrefTracker
        </Link>
        <nav className="flex gap-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-xs text-muted-foreground">
          Internal Use Only
        </div>
      </div>
    </header>
  );
}
