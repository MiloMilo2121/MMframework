import type { ReportSection, ParsedReport } from '@/lib/types/report';

const CHAPTER_DEPTH_MAP: Record<number, ReportSection['depth']> = {
  1: 'critical', 2: 'critical', 3: 'critical', 4: 'critical', 5: 'critical',
  6: 'important', 7: 'important',
  8: 'important', 9: 'important',
  10: 'complementary', 11: 'complementary', 12: 'complementary', 13: 'complementary',
  14: 'operational',
};

/**
 * Splits a combined report markdown into structured sections.
 */
export function parseReport(part1: string, part2: string, conclusions: string): ParsedReport {
  const fullText = [part1, part2, conclusions].filter(Boolean).join('\n\n');

  // Extract executive summary
  const esSplit = part1.split(/^## CAP\s+1/m);
  const executiveSummary = (esSplit[0] || '').replace(/^## EXECUTIVE SUMMARY/m, '').trim();

  // Extract roadmap from part2
  const roadmapMatch = part2.match(/## ROADMAP 30\/60\/90[\s\S]+?(?=## CAP 14|## CHECK QUALITÀ|---END_PART|$)/i);
  const roadmap = roadmapMatch ? roadmapMatch[0].trim() : '';

  // Parse chapters from both parts
  const chapters: ReportSection[] = [];
  const combinedResearch = part1 + '\n\n' + part2;

  // Match chapters: ## CAP N — Title or ## CAP N: Title
  const chapterRegex = /^## CAP\s+(\d+)\s*[—–:-]\s*([^\n]+)([\s\S]*?)(?=^## CAP\s+\d+|^## ROADMAP|^## CHECK QUALITÀ|---END_PART_1---|$)/gm;

  let match: RegExpExecArray | null;
  while ((match = chapterRegex.exec(combinedResearch)) !== null) {
    const num = parseInt(match[1]);
    const title = match[2].trim();
    const content = match[3].trim();

    chapters.push({
      id: `cap-${num}`,
      chapterNumber: num,
      title,
      content,
      depth: CHAPTER_DEPTH_MAP[num] || 'complementary',
    });
  }

  return {
    executiveSummary,
    chapters,
    roadmap,
    conclusions,
    rawText: fullText,
  };
}

/**
 * Detects chapter badge (depth label in Italian).
 */
export function depthLabel(depth: ReportSection['depth']): string {
  switch (depth) {
    case 'critical': return 'CRITICO';
    case 'important': return 'IMPORTANTE';
    case 'complementary': return 'COMPLEMENTARE';
    case 'operational': return 'OPERATIVO';
    default: return '';
  }
}

/**
 * Extracts CONTEXT_BRIDGE after ---END_PART_1--- marker.
 */
export function extractContextBridge(part1Text: string): string {
  const idx = part1Text.indexOf('---END_PART_1---');
  if (idx === -1) return '';
  return part1Text.slice(idx + '---END_PART_1---'.length).trim();
}

/**
 * Counts approximate words in a markdown string.
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
