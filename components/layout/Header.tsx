'use client';

import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Header() {
  return (
    <header className="h-16 border-b flex items-center px-6 gap-4 bg-white sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 group">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-semibold text-sm" style={{ color: 'var(--accent-deepest)' }}>
            SalesMap Intelligence
          </span>
          <Badge
            variant="outline"
            className="ml-2 text-xs py-0 h-4"
            style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-dark)' }}
          >
            powered by Axend
          </Badge>
        </div>
      </Link>

      <nav className="ml-auto flex items-center gap-4">
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          Dashboard
        </Link>
        <Link
          href="/analysis/new"
          className="text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          + Nuova Analisi
        </Link>
      </nav>
    </header>
  );
}
