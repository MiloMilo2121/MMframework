import type { ResearchLedger } from '@/lib/types/research-ledger';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';
import type {
  StrategyThesis,
  ChapterOutline,
  ChapterDraft,
  CritiqueRound,
  Verdict,
  FrameworkEntry,
} from './types';

interface BlackboardSnapshot {
  hasLedger: boolean;
  hasStrategy: boolean;
  chapterCount: number;
  outlineCount: number;
  draftsByChapter: Record<number, number>;
  rounds: Record<number, number>;
  promotedCount: number;
  selectedFrameworks: string[];
}

/**
 * Central versioned shared state for the multi-agent boardroom pipeline.
 * - Drafts are stored per-chapter, per-iteration (drafts.get(5) = [v1, v2, v3])
 * - Critique rounds are append-only audit trail
 * - Promoted chapters are the final accepted text
 */
export class Blackboard {
  ledger: ResearchLedger | null = null;
  strategy: StrategyThesis | null = null;
  chapters: ChapterSpec[] = [];
  outlines: Map<number, ChapterOutline> = new Map();
  drafts: Map<number, ChapterDraft[]> = new Map();
  critiqueRounds: Map<number, CritiqueRound[]> = new Map();
  verdicts: Map<number, Verdict[]> = new Map();
  promotedChapters: Map<number, string> = new Map();
  selectedFrameworks: FrameworkEntry[] = [];

  setLedger(ledger: ResearchLedger): void {
    this.ledger = ledger;
  }

  setStrategy(strategy: StrategyThesis): void {
    this.strategy = strategy;
  }

  setChapters(chapters: ChapterSpec[]): void {
    this.chapters = chapters;
  }

  setOutline(chapterNumber: number, outline: ChapterOutline): void {
    this.outlines.set(chapterNumber, outline);
  }

  setFrameworks(frameworks: FrameworkEntry[]): void {
    this.selectedFrameworks = frameworks;
  }

  appendDraft(chapterNumber: number, draft: ChapterDraft): void {
    const list = this.drafts.get(chapterNumber) ?? [];
    list.push(draft);
    this.drafts.set(chapterNumber, list);
  }

  latestDraft(chapterNumber: number): ChapterDraft | undefined {
    const list = this.drafts.get(chapterNumber);
    return list && list.length > 0 ? list[list.length - 1] : undefined;
  }

  appendCritiqueRound(chapterNumber: number, round: CritiqueRound): void {
    const list = this.critiqueRounds.get(chapterNumber) ?? [];
    list.push(round);
    this.critiqueRounds.set(chapterNumber, list);
  }

  appendVerdict(chapterNumber: number, verdict: Verdict): void {
    const list = this.verdicts.get(chapterNumber) ?? [];
    list.push(verdict);
    this.verdicts.set(chapterNumber, list);
  }

  promote(chapterNumber: number, finalText: string): void {
    this.promotedChapters.set(chapterNumber, finalText);
  }

  /**
   * Returns previously-promoted chapters concatenated, used for cross-chapter
   * coherence checks by the Coherence Auditor and to provide context to the Writer.
   * Cap returned text to keep prompts manageable.
   */
  previousPromotedSummary(beforeChapter: number, maxChars = 8000): string {
    const sorted = Array.from(this.promotedChapters.entries())
      .filter(([n]) => n < beforeChapter)
      .sort(([a], [b]) => a - b);
    if (sorted.length === 0) return '';
    const concat = sorted
      .map(([n, text]) => `### CAP ${n}\n${text.slice(0, 2000)}`)
      .join('\n\n');
    return concat.length <= maxChars ? concat : concat.slice(-maxChars);
  }

  snapshot(): BlackboardSnapshot {
    const draftsByChapter: Record<number, number> = {};
    Array.from(this.drafts.entries()).forEach(([n, list]) => { draftsByChapter[n] = list.length; });
    const rounds: Record<number, number> = {};
    Array.from(this.critiqueRounds.entries()).forEach(([n, list]) => { rounds[n] = list.length; });
    return {
      hasLedger: this.ledger !== null,
      hasStrategy: this.strategy !== null,
      chapterCount: this.chapters.length,
      outlineCount: this.outlines.size,
      draftsByChapter,
      rounds,
      promotedCount: this.promotedChapters.size,
      selectedFrameworks: this.selectedFrameworks.map((f) => f.id),
    };
  }
}
