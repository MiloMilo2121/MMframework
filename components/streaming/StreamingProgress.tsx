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
  status: 'pending' | 'running' | 'complete' | 'error';
  toolCalls?: number;
}

interface StreamingProgressProps {
  phases: Phase[];
  currentChapter?: string;
  log?: Array<{ ts: string; message: string; type?: string }>;
  estimatedSecondsLeft?: number;
  workers?: WorkerStatus[];
}

const STATUS_COLOR = {
  pending: '#D1D5DB',
  active: 'var(--accent-primary)',
  complete: '#22C55E',
  error: '#EF4444',
  running: 'var(--accent-primary)',
};

const WORKER_ICON = {
  pending: '⏳',
  running: '⚡',
  complete: '✓',
  error: '✗',
};

export function StreamingProgress({
  phases,
  currentChapter,
  log = [],
  estimatedSecondsLeft,
  workers = [],
}: StreamingProgressProps) {
  const statusColor = (s: Phase['status']) => STATUS_COLOR[s] || '#D1D5DB';

  return (
    <div className="space-y-4">
      {/* Worker grid — shown when orchestrator is running */}
      {workers.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Worker attivi
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {workers.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 text-xs rounded-md px-2 py-1.5"
                style={{
                  backgroundColor: w.status === 'complete' ? '#F0FDF4' : w.status === 'error' ? '#FEF2F2' : '#F8FAFA',
                  color: w.status === 'complete' ? '#166534' : w.status === 'error' ? '#991B1B' : 'var(--text-primary)',
                }}
              >
                <span className="text-sm leading-none">
                  {WORKER_ICON[w.status]}
                </span>
                <span className="font-medium truncate">{w.label}</span>
                {w.toolCalls !== undefined && w.toolCalls > 0 && (
                  <span className="ml-auto opacity-60 shrink-0">{w.toolCalls}🔍</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase bars */}
      {phases.map((phase, i) => (
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
                  backgroundColor: statusColor(phase.status) + '20',
                  color: statusColor(phase.status),
                  border: 'none',
                }}
              >
                {phase.status === 'pending' ? 'In attesa' :
                 phase.status === 'active' ? 'In corso...' :
                 phase.status === 'complete' ? 'Completata' : 'Errore'}
              </Badge>
            </div>
          </div>
          <Progress
            value={phase.progress}
            className="h-2"
            style={{
              ['--progress-color' as string]: statusColor(phase.status),
            }}
          />
          {phase.status === 'active' && currentChapter && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {currentChapter}
            </p>
          )}
        </div>
      ))}

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
              <div key={i} className={entry.type === 'error' ? 'text-red-400' : entry.type === 'warning' ? 'text-yellow-400' : ''}>
                <span className="opacity-50">{entry.ts}</span>{' '}
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
