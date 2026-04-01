'use client';

import type { ImmediateTest } from '@/lib/types/handoff';

interface Props {
  tests: ImmediateTest[];
}

export function TestPlan({ tests }: Props) {
  if (!tests || tests.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold" style={{ color: 'var(--accent-deepest)' }}>
        Piano Test 7-14 Giorni (ICE-ranked)
      </h3>
      <div className="grid gap-3">
        {tests.map((test, i) => {
          const iceTotal = test.ice_score?.total || 0;
          const iceColor = iceTotal >= 21 ? '#16A34A' : iceTotal >= 15 ? '#D97706' : '#DC2626';

          return (
            <div
              key={i}
              className="rounded-xl border p-4 space-y-2"
              style={{ borderColor: 'var(--border-brand)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--accent-deepest)' }}
                  >
                    {test.priority}
                  </span>
                  <p className="font-medium text-sm">{test.action}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>ICE:</span>
                  <span className="font-bold" style={{ color: iceColor }}>
                    {iceTotal}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    (I:{test.ice_score?.impact} C:{test.ice_score?.confidence} E:{test.ice_score?.ease})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Canale: </span>
                  <span>{test.channel}</span>
                </div>
                <div>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Segmento: </span>
                  <span>{test.segment}</span>
                </div>
                <div>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Timeline: </span>
                  <span>{test.timeline_days}gg</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className="rounded p-2"
                  style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
                >
                  <span className="font-semibold">KPI: </span>{test.kpi}
                  <div>✓ {test.success_threshold}</div>
                </div>
                <div
                  className="rounded p-2"
                  style={{ backgroundColor: '#FEF2F2', color: '#991B1B' }}
                >
                  <span className="font-semibold">Fallimento: </span>
                  <div>✗ {test.failure_threshold}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
