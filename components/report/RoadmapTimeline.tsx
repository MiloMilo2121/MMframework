'use client';

import type { RoadmapPhase } from '@/lib/types/handoff';

interface Props {
  h1_30d?: RoadmapPhase;
  h1_60d?: RoadmapPhase;
  h2_90d?: RoadmapPhase;
}

const phases = [
  {
    key: 'h1_30d' as const,
    label: '30 giorni',
    sublabel: 'H1 — Quick Wins',
    color: 'var(--accent-primary)',
    textColor: 'var(--accent-deepest)',
    bg: 'var(--fact-badge)',
  },
  {
    key: 'h1_60d' as const,
    label: '60 giorni',
    sublabel: 'H1/H2 — Capability',
    color: 'var(--accent-dark)',
    textColor: 'white',
    bg: 'var(--accent-dark)',
  },
  {
    key: 'h2_90d' as const,
    label: '90 giorni',
    sublabel: 'H2 — Crescita',
    color: 'var(--accent-deepest)',
    textColor: 'white',
    bg: 'var(--accent-deepest)',
  },
];

function PhaseCard({ phase: phaseDef, data }: { phase: typeof phases[0]; data?: RoadmapPhase }) {
  return (
    <div className="flex-1 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-brand)' }}>
      {/* Header */}
      <div
        className="p-4 text-center"
        style={{ backgroundColor: phaseDef.bg, color: phaseDef.textColor }}
      >
        <p className="font-bold text-lg">{phaseDef.label}</p>
        <p className="text-xs opacity-80 mt-0.5">{phaseDef.sublabel}</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 bg-white">
        {/* Deliverables */}
        {data?.deliverables && data.deliverables.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
              Deliverable
            </p>
            <ul className="space-y-1">
              {data.deliverables.map((d, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span style={{ color: phaseDef.color }}>▸</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* KPI */}
        {data?.kpi && (
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: 'var(--fact-badge)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent-dark)' }}>
              KPI di Fase
            </p>
            <p className="text-sm font-medium">{data.kpi}</p>
          </div>
        )}

        {/* Risk */}
        {data?.risk && (
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: '#FFF7F7', borderLeft: '3px solid #EF4444' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-red-500">
              Rischio
            </p>
            <p className="text-sm">{data.risk}</p>
          </div>
        )}

        {/* Early signal */}
        {data?.early_signal && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
              Segnale Precoce
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.early_signal}</p>
          </div>
        )}

        {!data && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            Dati non disponibili
          </p>
        )}
      </div>
    </div>
  );
}

export function RoadmapTimeline({ h1_30d, h1_60d, h2_90d }: Props) {
  const data = { h1_30d, h1_60d, h2_90d };

  return (
    <div id="roadmap" data-section-id="roadmap">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          📅
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--accent-deepest)' }}>
          Roadmap 30/60/90 Giorni
        </h2>
      </div>

      {/* Timeline connector */}
      <div className="relative flex gap-4 mb-6">
        {phases.map((phase, i) => (
          <div key={phase.key} className="flex-1 flex items-center">
            <div
              className="w-full h-2 rounded-full"
              style={{ backgroundColor: phase.bg === 'var(--fact-badge)' ? 'var(--accent-primary)' : phase.bg }}
            />
            {i < phases.length - 1 && (
              <div className="w-0 h-0" style={{ marginRight: -1 }} />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {phases.map((phase) => (
          <PhaseCard key={phase.key} phase={phase} data={data[phase.key]} />
        ))}
      </div>
    </div>
  );
}
