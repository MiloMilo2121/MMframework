'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Phase {
  label: string;
  description: string;
  progress: number;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface StreamingProgressProps {
  phases: Phase[];
  currentChapter?: string;
  log?: Array<{ ts: string; message: string; type?: string }>;
  estimatedSecondsLeft?: number;
}

export function StreamingProgress({
  phases,
  currentChapter,
  log = [],
  estimatedSecondsLeft,
}: StreamingProgressProps) {
  const statusColor = (s: Phase['status']) => {
    switch (s) {
      case 'active': return 'var(--accent-primary)';
      case 'complete': return '#22C55E';
      case 'error': return '#EF4444';
      default: return '#D1D5DB';
    }
  };

  return (
    <div className="space-y-4">
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
