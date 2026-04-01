'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart2, PlusCircle, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import type { AnalysisStatus } from '@/lib/types/analysis';

const statusConfig: Record<AnalysisStatus, { label: string; color: string }> = {
  draft: { label: 'Bozza', color: '#6B7280' },
  scouting: { label: 'Scouting', color: '#F59E0B' },
  blueprint: { label: 'Blueprint', color: '#3B82F6' },
  researching: { label: 'Ricerca', color: '#8B5CF6' },
  complete: { label: 'Completata', color: '#22C55E' },
  error: { label: 'Errore', color: '#EF4444' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { analyses } = useAnalysisStore();
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand hydration from localStorage
  useEffect(() => { setHydrated(true); }, []);

  if (!hydrated) return null;

  const total = analyses.length;
  const completed = analyses.filter((a) => a.status === 'complete').length;
  const inProgress = analyses.filter((a) =>
    ['scouting', 'blueprint', 'researching'].includes(a.status)
  ).length;

  const sorted = [...analyses].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface)' }}>
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Hero */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-deepest)' }}>
              SalesMap Intelligence
            </h1>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Analisi di mercato di livello consulenziale top-tier per PMI italiane
            </p>
          </div>
          <Button
            onClick={() => router.push('/analysis/new')}
            className="text-white gap-2"
            style={{ backgroundColor: 'var(--accent-deepest)' }}
            size="lg"
          >
            <PlusCircle className="w-4 h-4" />
            Nuova Analisi
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-4 border-0 shadow-sm">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--fact-badge)' }}
            >
              <BarChart2 className="w-5 h-5" style={{ color: 'var(--accent-dark)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-deepest)' }}>{total}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Analisi totali</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 border-0 shadow-sm">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#DCFCE7' }}
            >
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completed}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completate</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 border-0 shadow-sm">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{inProgress}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>In corso</p>
            </div>
          </Card>
        </div>

        {/* Analysis list */}
        {sorted.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl border-2 border-dashed"
            style={{ borderColor: 'var(--accent-primary)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--fact-badge)' }}
            >
              <TrendingUp className="w-8 h-8" style={{ color: 'var(--accent-dark)' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--accent-deepest)' }}>
              Nessuna analisi ancora
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Crea la tua prima analisi di mercato consulenziale
            </p>
            <Button
              onClick={() => router.push('/analysis/new')}
              className="text-white"
              style={{ backgroundColor: 'var(--accent-deepest)' }}
            >
              Crea la tua prima analisi →
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((analysis) => {
              const cfg = statusConfig[analysis.status];
              return (
                <Link key={analysis.id} href={`/analysis/${analysis.id}`}>
                  <Card
                    className="p-5 h-full border hover:shadow-md transition-shadow cursor-pointer"
                    style={{ borderColor: 'var(--border-brand)' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold truncate pr-2" style={{ color: 'var(--text-primary)' }}>
                        {analysis.clientName}
                      </h3>
                      <Badge
                        className="shrink-0 text-xs"
                        style={{ backgroundColor: cfg.color + '20', color: cfg.color, border: 'none' }}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-sm mb-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                      {analysis.sector}
                    </p>
                    {analysis.geography && (
                      <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {analysis.geography}
                      </p>
                    )}
                    {analysis.status === 'complete' && (
                      <p className="text-xs mb-2" style={{ color: 'var(--accent-dark)' }}>
                        {analysis.metadata?.chaptersFound || 0} capitoli •{' '}
                        {(analysis.metadata?.wordCount || 0).toLocaleString()} parole
                      </p>
                    )}
                    <p className="text-xs mt-auto" style={{ color: 'var(--text-secondary)' }}>
                      {formatDistanceToNow(new Date(analysis.updatedAt), { addSuffix: true, locale: it })}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
