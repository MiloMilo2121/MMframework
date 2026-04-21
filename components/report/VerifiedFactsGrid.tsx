'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface VerifiedFact {
  claim: string;
  value?: string;
  source_name: string;
  source_url?: string;
  published_date?: string;
  status?: 'verified' | 'estimated' | 'unverified' | 'contradicted';
  contributed_by?: string;
}

interface Props {
  facts: VerifiedFact[];
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  verified:     { color: '#22C55E', label: 'Verificato' },
  estimated:    { color: '#F59E0B', label: 'Stimato' },
  unverified:   { color: '#9CA3AF', label: 'Non verificato' },
  contradicted: { color: '#EF4444', label: 'Contraddetto' },
};

export function VerifiedFactsGrid({ facts }: Props) {
  const [filter, setFilter] = useState<string>('all');

  if (!facts || facts.length === 0) return null;

  const statuses = ['all', 'verified', 'estimated', 'unverified', 'contradicted'] as const;
  const filtered = filter === 'all' ? facts : facts.filter((f) => (f.status || 'estimated') === filter);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {statuses.map((s) => {
          const style = s !== 'all' ? STATUS_STYLE[s] : null;
          const count = s === 'all' ? facts.length : facts.filter((f) => (f.status || 'estimated') === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="text-xs px-3 py-1 rounded-full border transition-colors font-medium"
              style={{
                borderColor: filter === s ? (style?.color || 'var(--accent-deepest)') : 'var(--border-brand)',
                backgroundColor: filter === s ? (style?.color || 'var(--accent-deepest)') + '20' : 'white',
                color: filter === s ? (style?.color || 'var(--accent-deepest)') : 'var(--text-secondary)',
              }}
            >
              {s === 'all' ? 'Tutti' : style?.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((fact, i) => {
          const status = fact.status || 'estimated';
          const style = STATUS_STYLE[status] ?? STATUS_STYLE.estimated;

          return (
            <div
              key={i}
              className="rounded-lg border p-3 space-y-1.5"
              style={{ borderColor: 'var(--border-brand)', backgroundColor: 'white' }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
                  {fact.claim}
                </p>
                <span
                  className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ backgroundColor: style.color + '20', color: style.color }}
                >
                  {style.label}
                </span>
              </div>

              {fact.value && (
                <p className="text-sm font-bold" style={{ color: 'var(--accent-deepest)' }}>
                  {fact.value}
                </p>
              )}

              <div className="flex items-center gap-2">
                {fact.source_url ? (
                  <a
                    href={fact.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] hover:underline"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    {fact.source_name}
                  </a>
                ) : (
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {fact.source_name}
                  </span>
                )}
                {fact.published_date && (
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    · {fact.published_date}
                  </span>
                )}
                {fact.contributed_by && (
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    · {fact.contributed_by}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
