'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown } from '@/lib/markdown';
import type { ChapterEntry } from '@/lib/types/analysis';

interface Props {
  chapters: Record<number, ChapterEntry>;
  autoScroll?: boolean;
}

const ChapterBody = memo(function ChapterBody({ text }: { text: string }) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return (
    <div
      className="text-xs leading-relaxed"
      style={{ color: 'var(--text-primary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export function LiveReportPreview({ chapters, autoScroll = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  const sortedEntries = useMemo(
    () => Object.entries(chapters)
      .map(([k, v]) => ({ number: parseInt(k, 10), ...v }))
      .filter((c) => c.status === 'done' && c.text)
      .sort((a, b) => a.number - b.number),
    [chapters]
  );

  useEffect(() => {
    if (autoScroll && !userScrolled && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [sortedEntries.length, autoScroll, userScrolled]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setUserScrolled(scrollHeight - scrollTop - clientHeight >= 80);
  };

  if (sortedEntries.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center rounded-xl border"
        style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Il report apparirà qui man mano che i capitoli vengono scritti...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-brand)' }}>
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs font-semibold"
        style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
      >
        <span>Anteprima report — {sortedEntries.length} capitoli</span>
        {userScrolled && (
          <button
            onClick={() => {
              setUserScrolled(false);
              if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }}
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-deepest)' }}
          >
            ↓ Vai in fondo
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ backgroundColor: 'white' }}
      >
        {sortedEntries.map((ch) => (
          <div
            key={ch.number}
            id={`live-cap-${ch.number}`}
            className="mb-6 pb-4 border-b last:border-0"
            style={{ borderColor: 'var(--border-brand)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-primary)' }}>
              CAP {ch.number} — {ch.title}
            </p>
            <ChapterBody text={ch.text} />
            <p className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              {ch.wordCount.toLocaleString()} parole
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
