'use client';

import type { ChapterSpec } from '@/lib/ai/prompts/architect';

type CellStatus = 'pending' | 'writing' | 'done' | 'error';

interface Props {
  chapterSpecs: ChapterSpec[];
  statusMap: Record<number, CellStatus>;
  onCellClick?: (number: number) => void;
}

const CELL_STYLE: Record<CellStatus, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#1F2937', color: '#6B7280', label: '·' },
  writing:  { bg: 'var(--accent-primary)', color: 'var(--accent-deepest)', label: '✍' },
  done:     { bg: '#22C55E', color: 'white', label: '✓' },
  error:    { bg: '#EF4444', color: 'white', label: '!' },
};

export function ChapterProgressGrid({ chapterSpecs, statusMap, onCellClick }: Props) {
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
          const style = CELL_STYLE[status];
          const isWriting = status === 'writing';
          const isDone = status === 'done';

          return (
            <button
              key={spec.number}
              title={`CAP ${spec.number} — ${spec.title}`}
              onClick={() => isDone && onCellClick?.(spec.number)}
              disabled={!isDone}
              className="w-9 h-9 rounded-md text-xs font-bold flex items-center justify-center transition-all duration-300 focus:outline-none"
              style={{
                backgroundColor: style.bg,
                color: style.color,
                animation: isWriting ? 'pulse 1.2s ease-in-out infinite' : undefined,
                cursor: isDone ? 'pointer' : 'default',
                boxShadow: isWriting ? `0 0 8px var(--accent-primary)` : undefined,
              }}
            >
              {isWriting ? (
                <span style={{ animation: 'pulse 0.8s ease-in-out infinite' }}>✍</span>
              ) : status === 'pending' ? (
                <span className="text-base leading-none">{spec.number}</span>
              ) : (
                style.label
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
