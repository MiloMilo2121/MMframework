'use client';

import Link from 'next/link';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import type { AnalysisStatus } from '@/lib/types/analysis';

const statusConfig: Record<AnalysisStatus, { label: string; color: string }> = {
  draft: { label: 'Bozza', color: '#6B7280' },
  scouting: { label: 'Scouting', color: '#F59E0B' },
  blueprint: { label: 'Blueprint', color: '#3B82F6' },
  researching: { label: 'Ricerca', color: '#8B5CF6' },
  complete: { label: 'Completata', color: '#22C55E' },
  error: { label: 'Errore', color: '#EF4444' },
};

export function Sidebar() {
  const { analyses, activeAnalysisId } = useAnalysisStore();
  const sorted = [...analyses].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <aside
      className="w-64 border-r h-[calc(100vh-4rem)] flex flex-col"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div className="p-4 border-b">
        <Link
          href="/analysis/new"
          className="w-full block text-center text-sm font-medium py-2 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          + Nuova Analisi
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {sorted.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              Nessuna analisi ancora
            </p>
          )}
          {sorted.map((analysis) => {
            const cfg = statusConfig[analysis.status];
            const isActive = analysis.id === activeAnalysisId;
            return (
              <Link
                key={analysis.id}
                href={`/analysis/${analysis.id}`}
                className={`block rounded-lg p-3 transition-colors ${isActive ? 'ring-2 ring-[#AAD8D8]' : 'hover:bg-white'}`}
                style={isActive ? { backgroundColor: 'white' } : {}}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {analysis.clientName}
                  </span>
                  <Badge
                    className="text-xs shrink-0 py-0 h-4"
                    style={{ backgroundColor: cfg.color + '20', color: cfg.color, border: 'none' }}
                  >
                    {cfg.label}
                  </Badge>
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {analysis.sector}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {formatDistanceToNow(new Date(analysis.updatedAt), { addSuffix: true, locale: it })}
                </p>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
