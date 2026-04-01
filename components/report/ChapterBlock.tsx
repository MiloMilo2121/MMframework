'use client';

import { marked } from 'marked';
import { Badge } from '@/components/ui/badge';
import type { ReportSection } from '@/lib/types/report';
import { depthLabel } from '@/lib/parsers/parse-report';

const CHAPTER_ICONS: Record<number, string> = {
  1: '📊', 2: '⚔️', 3: '📈', 4: '💰', 5: '📣',
  6: '👤', 7: '🎯', 8: '💬', 9: '📉', 10: '🔄',
  11: '❤️', 12: '🛠️', 13: '📚', 14: '🗺️',
};

const DEPTH_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICO: { bg: '#FEF2F2', text: '#DC2626' },
  IMPORTANTE: { bg: '#FFFBEB', text: '#D97706' },
  COMPLEMENTARE: { bg: '#EFF6FF', text: '#2563EB' },
  OPERATIVO: { bg: '#F0FDF4', text: '#16A34A' },
};

// Replaces [FATTO], [IPOTESI], [NON TRACCIATO] markers with colored badges
function processContent(html: string): string {
  return html
    .replace(/\[FATTO\]/g, `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" style="background-color:#E0F2F1;color:#065F46">FATTO</span>`)
    .replace(/\[IPOTESI\]/g, `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" style="background-color:#FEF3C7;color:#92400E">IPOTESI</span>`)
    .replace(/\[NON TRACCIATO\]/g, `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" style="background-color:#FEE2E2;color:#991B1B">NON TRACCIATO</span>`);
}

interface Props {
  section: ReportSection;
}

export function ChapterBlock({ section }: Props) {
  const icon = CHAPTER_ICONS[section.chapterNumber ?? 0] || '📄';
  const depthLbl = depthLabel(section.depth);
  const depthStyle = DEPTH_COLORS[depthLbl] || DEPTH_COLORS['COMPLEMENTARE'];

  // Parse and process content
  const rawHtml = marked.parse(section.content || '', { breaks: true }) as string;
  const processedHtml = processContent(rawHtml);

  // Extract the 4 fixed blocks if they exist in the content
  const hasImplicazioni = section.content?.includes('IMPLICAZIONI OPERATIVE');
  const hasDecisioni = section.content?.includes('DECISIONI / TRADE-OFF') || section.content?.includes('DECISIONI/TRADE-OFF');
  const hasBreakpoints = section.content?.includes('BREAKPOINTS');
  const hasTest = section.content?.includes('TEST 7') || section.content?.includes('TEST 7-14');

  const missingBlocks = [
    !hasImplicazioni && '① Implicazioni Operative',
    !hasDecisioni && '② Decisioni / Trade-off',
    !hasBreakpoints && '③ Breakpoints',
    !hasTest && '④ Test 7-14gg',
  ].filter(Boolean);

  return (
    <div
      id={section.id}
      data-section-id={section.id}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border-brand)', pageBreakBefore: 'always' }}
    >
      {/* Chapter header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: 'var(--accent-deepest)', color: 'white' }}
          >
            {section.chapterNumber}
          </div>
          <span className="text-lg">{icon}</span>
          <h2 className="font-bold text-lg" style={{ color: 'var(--accent-deepest)' }}>
            {section.title}
          </h2>
        </div>
        <Badge
          className="text-xs"
          style={{ backgroundColor: depthStyle.bg, color: depthStyle.text, border: 'none' }}
        >
          {depthLbl}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-6">
        <div
          className="prose prose-sm max-w-none
            prose-headings:text-[var(--accent-deepest)]
            prose-strong:text-[var(--text-primary)]
            prose-table:border-collapse
            prose-th:bg-[var(--accent-deepest)] prose-th:text-white prose-th:p-2
            prose-td:border prose-td:border-[var(--border-brand)] prose-td:p-2
            prose-tr:even:bg-[var(--surface)]"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />

        {/* Warning if fixed blocks are missing */}
        {missingBlocks.length > 0 && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            Blocchi fissi mancanti: {missingBlocks.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
