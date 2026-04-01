'use client';

import type { MicroSegment } from '@/lib/types/handoff';

interface Props {
  segments: MicroSegment[];
}

const statusConfig = {
  confirmed: { label: 'CONFERMATO', bg: '#DCFCE7', color: '#166534' },
  updated: { label: 'AGGIORNATO', bg: '#FFFBEB', color: '#92400E' },
  new: { label: 'NUOVO', bg: '#EFF6FF', color: '#1D4ED8' },
  eliminated: { label: 'ELIMINATO', bg: '#FEE2E2', color: '#991B1B' },
};

export function MicroSegmentTable({ segments }: Props) {
  if (!segments || segments.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-brand)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--accent-deepest)', color: 'white' }}>
            <th className="text-left p-3 font-semibold">Segmento</th>
            <th className="text-left p-3 font-semibold">Trigger</th>
            <th className="text-left p-3 font-semibold">Canale</th>
            <th className="text-left p-3 font-semibold">Test KPI</th>
            <th className="text-left p-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg, i) => {
            const cfg = statusConfig[seg.status] || statusConfig.confirmed;
            return (
              <tr
                key={i}
                className="border-t"
                style={{
                  borderColor: 'var(--border-brand)',
                  backgroundColor: i % 2 === 0 ? 'white' : 'var(--surface)',
                }}
              >
                <td className="p-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {seg.name}
                </td>
                <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                  {seg.trigger}
                </td>
                <td className="p-3">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: 'var(--fact-badge)', color: 'var(--accent-dark)' }}
                  >
                    {seg.channel}
                  </span>
                </td>
                <td className="p-3 text-xs">
                  <div>{seg.test_kpi}</div>
                  {seg.test_threshold && (
                    <div className="text-green-600 mt-0.5">✓ {seg.test_threshold}</div>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
