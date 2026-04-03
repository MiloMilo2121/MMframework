'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Phase {
  label: string;
  description: string;
  progress: number;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export interface WorkerStatus {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error' | 'partial';
  toolCalls?: number;
}

interface StreamingProgressProps {
  phases: Phase[];
  currentChapter?: string;
  log?: Array<{ ts: string; message: string; type?: string }>;
  estimatedSecondsLeft?: number;
  workers?: WorkerStatus[];
}

const WORKER_COLOR: Record<WorkerStatus['status'], string> = {
  pending:  '#D1D5DB',
  running:  'var(--accent-primary)',
  complete: '#22C55E',
  partial:  '#F59E0B',
  error:    '#EF4444',
};

const WORKER_ICON: Record<WorkerStatus['status'], string> = {
  pending:  '○',
  running:  '⚡',
  complete: '✓',
  partial:  '◑',
  error:    '✗',
};

const WORKER_PROGRESS: Record<WorkerStatus['status'], number> = {
  pending:  0,
  running:  55,  // animated bar shows ~55% while running
  complete: 100,
  partial:  70,
  error:    100,
};

const PHASE_STATUS_COLOR = {
  pending:  '#D1D5DB',
  active:   'var(--accent-primary)',
  complete: '#22C55E',
  error:    '#EF4444',
};

export function StreamingProgress({
  phases,
  currentChapter,
  log = [],
  estimatedSecondsLeft,
  workers = [],
}: StreamingProgressProps) {

  return (
    <div className="space-y-4">

      {/* Parallel Worker bars — shown when orchestrator is running */}
      {workers.length > 0 && (
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Worker paralleli
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {workers.filter((w) => w.status === 'complete' || w.status === 'partial').length}/{workers.length} completati
            </p>
          </div>

          <div className="space-y-2.5">
            {workers.map((w) => {
              const color = WORKER_COLOR[w.status] || '#D1D5DB';
              const progress = WORKER_PROGRESS[w.status] ?? 0;
              const isRunning = w.status === 'running';

              return (
                <div key={w.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <span style={{ color }}>{WORKER_ICON[w.status]}</span>
                      {w.label}
                    </span>
                    <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      {w.toolCalls !== undefined && w.toolCalls > 0 && (
                        <span>{w.toolCalls} 🔍</span>
                      )}
                      <span style={{ color }}>
                        {w.status === 'pending'  ? 'In attesa'   :
                         w.status === 'running'  ? 'Ricerca...'  :
                         w.status === 'complete' ? 'Completato'  :
                         w.status === 'partial'  ? 'Parziale'    : 'Errore'}
                      </span>
                    </span>
                  </div>

                  {/* Progress bar with animated pulse while running */}
                  <div
                    className="relative h-1.5 w-full rounded-full overflow-hidden"
                    style={{ backgroundColor: color + '25' }}
                  >
                    <div
                      className={isRunning ? 'animate-pulse' : ''}
                      style={{
                        height: '100%',
                        width: `${progress}%`,
                        backgroundColor: color,
                        borderRadius: '9999px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                    {/* Shimmer effect while running */}
                    {isRunning && (
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, ${color}50 50%, transparent 100%)`,
                          animation: 'shimmer 1.5s infinite',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase bars */}
      {phases.map((phase, i) => {
        const color = PHASE_STATUS_COLOR[phase.status] || '#D1D5DB';
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                FASE {i + 1}/{phases.length}: {phase.label}
              </span>
              <div className="flex items-center gap-2">
                {phase.status === 'active' && estimatedSecondsLeft !== undefined && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    ~{Math.ceil(estimatedSecondsLeft / 60)}min
                  </span>
                )}
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: color + '20',
                    color,
                    border: 'none',
                  }}
                >
                  {phase.status === 'pending'  ? 'In attesa'  :
                   phase.status === 'active'   ? 'In corso...' :
                   phase.status === 'complete' ? 'Completata' : 'Errore'}
                </Badge>
              </div>
            </div>
            <Progress
              value={phase.progress}
              className="h-2"
              style={{ ['--progress-color' as string]: color }}
            />
            {phase.status === 'active' && currentChapter && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {currentChapter}
              </p>
            )}
          </div>
        );
      })}

      {/* Event log */}
      {log.length > 0 && (
        <details className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <summary className="cursor-pointer font-medium mb-2">
            Log eventi ({log.length})
          </summary>
          <div
            className="max-h-40 overflow-y-auto p-3 rounded-lg font-mono space-y-1"
            style={{ backgroundColor: '#0d1117', color: '#7d8590' }}
          >
            {log.map((entry, i) => (
              <div
                key={i}
                className={
                  entry.type === 'error'   ? 'text-red-400'    :
                  entry.type === 'warning' ? 'text-yellow-400' : ''
                }
              >
                <span className="opacity-50">{entry.ts}</span>{' '}
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Shimmer keyframe (injected once) */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
