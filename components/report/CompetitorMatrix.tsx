'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CompetitorRow {
  name: string;
  url?: string;
  pricing_model?: string;
  price_range?: string;
  key_messages?: string[];
  strengths?: string[];
  weaknesses?: string[];
  review_score?: number;
  advertising_channels?: string[];
}

interface Props {
  competitors: CompetitorRow[];
}

type SortKey = 'name' | 'review_score' | 'price_range';
type SortDir = 'asc' | 'desc';

export function CompetitorMatrix({ competitors }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('review_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (!competitors || competitors.length === 0) return null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...competitors].sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    if (sortKey === 'name') { av = a.name || ''; bv = b.name || ''; }
    else if (sortKey === 'review_score') { av = a.review_score ?? 0; bv = b.review_score ?? 0; }
    else if (sortKey === 'price_range') { av = a.price_range || ''; bv = b.price_range || ''; }

    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />
      : <ChevronDown className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />;
  };

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-brand)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: 'var(--surface)' }}>
            {[
              { key: 'name' as SortKey, label: 'Competitor' },
              { key: 'price_range' as SortKey, label: 'Prezzo' },
              { key: 'review_score' as SortKey, label: 'Score' },
            ].map(({ key, label }) => (
              <th
                key={key}
                className="text-left px-4 py-3 font-semibold cursor-pointer select-none border-b"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-brand)' }}
                onClick={() => handleSort(key)}
              >
                <span className="flex items-center gap-1">
                  {label}
                  <SortIcon k={key} />
                </span>
              </th>
            ))}
            <th
              className="text-left px-4 py-3 font-semibold border-b"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-brand)' }}
            >
              Punti di forza
            </th>
            <th
              className="text-left px-4 py-3 font-semibold border-b"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-brand)' }}
            >
              Debolezze
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr
              key={i}
              className="border-b last:border-0 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border-brand)' }}
            >
              <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--accent-primary)' }}>
                    {c.name}
                  </a>
                ) : c.name}
                {c.pricing_model && (
                  <span className="block text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {c.pricing_model}
                  </span>
                )}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                {c.price_range || '—'}
              </td>
              <td className="px-4 py-3">
                {c.review_score != null ? (
                  <span
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: c.review_score >= 4 ? '#22C55E' : c.review_score >= 3 ? '#F59E0B' : '#EF4444' }}
                  >
                    ★ {c.review_score.toFixed(1)}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                {(c.strengths ?? []).slice(0, 3).map((s, j) => (
                  <div key={j} className="flex items-start gap-1">
                    <span className="text-green-500 shrink-0">+</span>{s}
                  </div>
                ))}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                {(c.weaknesses ?? []).slice(0, 3).map((w, j) => (
                  <div key={j} className="flex items-start gap-1">
                    <span className="text-red-400 shrink-0">−</span>{w}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
