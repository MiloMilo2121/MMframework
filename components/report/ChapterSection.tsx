'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';

interface Props {
  number: number;
  title: string;
  text: string;
  wordCount?: number;
  defaultOpen?: boolean;
}

export function ChapterSection({ number, title, text, wordCount, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const isHandoff = title.toUpperCase().includes('HANDOFF');

  const rendered = useMemo(() => {
    if (isHandoff) {
      const jsonMatch = text.match(/```json\s*([\s\S]+?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return { kind: 'json' as const, value: JSON.stringify(parsed, null, 2) };
        } catch { /* fall through to markdown */ }
      }
    }
    return { kind: 'html' as const, value: renderMarkdown(text) };
  }, [text, isHandoff]);

  return (
    <div
      id={`cap-${number}`}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border-brand)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none"
        style={{ backgroundColor: 'white' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--accent-deepest)' }}
          >
            {number}
          </span>
          <span className="font-semibold truncate" style={{ color: 'var(--accent-deepest)' }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {wordCount && (
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
              {wordCount.toLocaleString()} parole
            </span>
          )}
          {open ? (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: 'var(--border-brand)', backgroundColor: 'white' }}>
          {rendered.kind === 'json' ? (
            <pre className="text-xs overflow-x-auto p-4 rounded-lg" style={{ backgroundColor: '#0d1117', color: '#7dd3ac' }}>
              {rendered.value}
            </pre>
          ) : (
            <div
              className="prose prose-sm max-w-none text-sm"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: rendered.value }}
            />
          )}
        </div>
      )}
    </div>
  );
}
