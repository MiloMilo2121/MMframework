'use client';

import { useEffect, useState } from 'react';
import type { ReportSection } from '@/lib/types/report';

interface Props {
  chapters: ReportSection[];
  hasExecutiveSummary?: boolean;
  hasRoadmap?: boolean;
  hasConclusions?: boolean;
}

export function ReportIndex({ chapters, hasExecutiveSummary, hasRoadmap, hasConclusions }: Props) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    const sections = document.querySelectorAll('[data-section-id]');
    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [chapters]);

  const items = [
    ...(hasExecutiveSummary ? [{ id: 'executive-summary', label: 'Executive Summary' }] : []),
    ...chapters.map((c) => ({
      id: c.id,
      label: `Cap ${c.chapterNumber} — ${c.title}`,
    })),
    ...(hasRoadmap ? [{ id: 'roadmap', label: 'Roadmap 30/60/90' }] : []),
    ...(hasConclusions ? [{ id: 'conclusions', label: 'Conclusioni e Raccomandazioni' }] : []),
  ];

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border-brand)' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--accent-deepest)' }}>
        Indice
      </h2>
      <nav className="space-y-1">
        {items.map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="flex items-center gap-3 py-1.5 px-2 rounded-lg text-sm transition-colors group"
            style={{
              backgroundColor: activeId === item.id ? 'var(--fact-badge)' : 'transparent',
              color: activeId === item.id ? 'var(--accent-deepest)' : 'var(--text-secondary)',
            }}
          >
            <span className="text-xs font-mono w-5 text-right" style={{ color: 'var(--accent-primary)' }}>
              {i + 1}
            </span>
            <span className="truncate">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
