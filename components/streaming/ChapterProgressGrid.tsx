'use client';

import type { ChapterSpec } from '@/lib/ai/prompts/architect';
import { STATUS_COLOR, type ChapterStatus } from '@/lib/ui/status';
import type { Severity } from '@/lib/agents/types';

interface Props {
  chapterSpecs: ChapterSpec[];
  statusMap: Record<number, ChapterStatus>;
  /** Round counter per chapter (Boardroom mode only). Shown as a small badge. */
  roundsMap?: Record<number, number>;
  /** Max severity per chapter (Boardroom mode only). Drives ring color. */
  severityMap?: Record<number, Severity>;
  onCellClick?: (number: number) => void;
}

const SEVERITY_RING: Record<Severity, string> = {
  none:    '#22C55E',
  minor:   '#F59E0B',
  major:   '#EA580C',
  blocker: '#DC2626',
};

const CELL_LABEL: Record<ChapterStatus, string> = {
  pending: '·',
  writing: '✍',
  done:    '✓',
  error:   '!',
};

const CELL_FG: Record<ChapterStatus, string> = {
  pending: '#6B7280',
  writing: 'var(--accent-deepest)',
  done:    'white',
  error:   'white',
};

export function ChapterProgressGrid({ chapterSpecs, statusMap, roundsMap, severityMap, onCellClick }: Props) {
  if (chapterSpecs.length === 0) return null;

  const doneCount = Object.values(statusMap).filter((s) => s === 'done').length;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Capitoli
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {doneCount}/{chapterSpecs.length} scritti
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chapterSpecs.map((spec) => {
          const status = statusMap[spec.number] ?? 'pending';
          const isWriting = status === 'writing';
          const isDone = status === 'done';

          const rounds = roundsMap?.[spec.number] ?? 0;
          const severity = severityMap?.[spec.number];
          const ringColor = severity ? SEVERITY_RING[severity] : undefined;
          const showRoundBadge = rounds > 1 && isDone;

          return (
            <button
              key={spec.number}
              title={`CAP ${spec.number} — ${spec.title}${rounds > 0 ? ` (${rounds} round${rounds === 1 ? '' : 's'})` : ''}`}
              onClick={() => isDone && onCellClick?.(spec.number)}
              disabled={!isDone}
              className="relative w-9 h-9 rounded-md text-xs font-bold flex items-center justify-center transition-all duration-300 focus:outline-none"
              style={{
                backgroundColor: STATUS_COLOR[status],
                color: CELL_FG[status],
                animation: isWriting ? 'pulse 1.2s ease-in-out infinite' : undefined,
                cursor: isDone ? 'pointer' : 'default',
                boxShadow: isWriting
                  ? '0 0 8px var(--accent-primary)'
                  : ringColor
                  ? `0 0 0 2px ${ringColor}`
                  : undefined,
              }}
            >
              {status === 'pending' ? <span className="text-base leading-none">{spec.number}</span> : CELL_LABEL[status]}
              {showRoundBadge && (
                <span
                  className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-deepest)', color: 'white' }}
                >
                  {rounds}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
