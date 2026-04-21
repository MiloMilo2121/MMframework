'use client';

import { useState } from 'react';

interface ChapterNavItem {
  number: number;
  title: string;
}

interface Props {
  chapters: ChapterNavItem[];
  activeNumber?: number;
  onSelect: (number: number) => void;
}

export function ChapterNavSidebar({ chapters, activeNumber, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? chapters.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        String(c.number).includes(search)
      )
    : chapters;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border-brand)' }}>
        <input
          type="text"
          placeholder="Cerca capitolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs rounded-lg border px-3 py-2 focus:outline-none focus:ring-1"
          style={{
            borderColor: 'var(--border-brand)',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)',
          }}
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filtered.map((ch) => {
          const isActive = ch.number === activeNumber;
          const isHandoff = ch.title.toUpperCase().includes('HANDOFF');

          return (
            <button
              key={ch.number}
              onClick={() => onSelect(ch.number)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors rounded-lg mx-1 focus:outline-none"
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' + '30' : undefined,
                color: isActive ? 'var(--accent-deepest)' : isHandoff ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: isActive || isHandoff ? 600 : 400,
                width: 'calc(100% - 8px)',
              }}
            >
              <span
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: isActive ? 'var(--accent-deepest)' : 'var(--border-brand)',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                }}
              >
                {ch.number}
              </span>
              <span className="truncate leading-tight">{ch.title}</span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            Nessun capitolo trovato
          </p>
        )}
      </nav>
    </div>
  );
}
