import { openrouter } from '@/lib/ai/openrouter';
import type OpenAI from 'openai';
import { extractLedgerSlice } from '@/lib/ai/ghostwriter';
import { WRITER_SYSTEM_BASE, buildWriterUserPrompt } from '@/lib/ai/prompts/writer';
import { runBoardroom, type BoardroomResult } from './boardroom';
import { Blackboard } from './blackboard';
import { buildFrameworksPromptBlock } from '@/lib/rag/lookup';
import {
  type ChapterDraft,
  type CritiqueRound,
  type FrameworkEntry,
  type CostCallback,
  type ReviewerId,
} from './types';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';

const WRITER_MAX_TOKENS = 3500;
const WRITER_TIMEOUT_MS = 90_000;

interface WriteChapterWithCritiqueParams {
  spec: ChapterSpec;
  blackboard: Blackboard;
  frameworks: FrameworkEntry[];
  writerModel?: string;
  maxIterations?: number;
  innovationCritical?: boolean;
  onCost?: CostCallback;
  onEvent?: (event: string, data: Record<string, unknown>) => void;
  onReviewerEvent?: (event: 'started' | 'complete', data: { reviewerId: ReviewerId }) => void;
}

export interface ChapterCritiqueResult {
  chapterNumber: number;
  finalText: string;
  rounds: CritiqueRound[];
  totalIterations: number;
  forcedPromote: boolean;
  unresolvedIssuesCount: number;
}

/**
 * Writer ↔ Boardroom loop for one chapter.
 * - Writes draft v1 from outline (no critique brief)
 * - Calls Boardroom; if PROMOTE -> return; if REVISE -> draft v2 with brief
 * - Repeats up to maxIterations; forced PROMOTE at last iter with unresolved log
 */
export async function writeChapterWithCritique(
  params: WriteChapterWithCritiqueParams
): Promise<ChapterCritiqueResult> {
  const {
    spec,
    blackboard,
    frameworks,
    writerModel = process.env.WRITER_MODEL || process.env.STEP2_MODEL || 'anthropic/claude-sonnet-4-6',
    maxIterations = 3,
    innovationCritical = false,
    onCost,
    onEvent,
    onReviewerEvent,
  } = params;

  if (!blackboard.ledger) throw new Error('Blackboard.ledger missing — required for chapter writing');
  if (!blackboard.strategy) throw new Error('Blackboard.strategy missing — required for chapter writing');

  const outline = blackboard.outlines.get(spec.number);
  if (!outline) throw new Error(`Outline missing for chapter ${spec.number}`);

  const ledgerSlice = extractLedgerSlice(spec, blackboard.ledger);
  const frameworksBlock = buildFrameworksPromptBlock(frameworks);
  const previousChaptersSummary = blackboard.previousPromotedSummary(spec.number);
  const outlineMarkdown = JSON.stringify(outline, null, 2);

  const rounds: CritiqueRound[] = [];
  let priorCritiquesSummary = '';
  let currentDraft = '';
  let lastBoardroom: BoardroomResult | null = null;
  let forcedPromote = false;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    onEvent?.('writer_started', { chapter: spec.number, iteration });

    const writerPrompt = buildWriterUserPrompt({
      spec,
      outline,
      thesis: blackboard.strategy,
      ledgerSlice,
      frameworksBlock,
      previousChaptersSummary,
      iteration,
      previousDraft: iteration > 1 ? currentDraft : undefined,
      revisionBrief: iteration > 1 ? lastBoardroom?.brief : undefined,
    });

    currentDraft = await callWriter(writerModel, writerPrompt, iteration > 1, onCost, spec.number);

    const draft: ChapterDraft = {
      chapter_number: spec.number,
      iteration,
      text: currentDraft,
      wordCount: currentDraft.split(/\s+/).filter(Boolean).length,
      createdAt: Date.now(),
    };
    blackboard.appendDraft(spec.number, draft);
    onEvent?.('writer_draft_ready', { chapter: spec.number, iteration, wordCount: draft.wordCount });

    onEvent?.('boardroom_started', { chapter: spec.number, iteration });
    lastBoardroom = await runBoardroom({
      draft: currentDraft,
      thesis: blackboard.strategy,
      outline,
      outlineMarkdown,
      ledgerSlice,
      previousChaptersSummary,
      iteration,
      maxIterations,
      chapterTitle: spec.title,
      innovationCritical,
      priorCritiquesSummary,
      onCost,
      onReviewerEvent,
    });

    const round: CritiqueRound = {
      chapter_number: spec.number,
      iteration,
      critiques: lastBoardroom.critiques,
      durationMs: lastBoardroom.durationMs,
    };
    blackboard.appendCritiqueRound(spec.number, round);
    blackboard.appendVerdict(spec.number, lastBoardroom.verdict);
    rounds.push(round);

    onEvent?.('chair_verdict', {
      chapter: spec.number,
      iteration,
      decision: lastBoardroom.verdict.decision,
      severity: lastBoardroom.verdict.severity,
      critiqueCount: lastBoardroom.critiques.length,
    });

    if (lastBoardroom.verdict.decision === 'PROMOTE') {
      break;
    }

    if (iteration === maxIterations) {
      forcedPromote = true;
      break;
    }

    priorCritiquesSummary = summarizeCritiques(lastBoardroom.critiques);
    onEvent?.('revision_requested', {
      chapter: spec.number,
      iteration,
      mustFixCount: lastBoardroom.brief.must_fix.length,
    });
  }

  const finalIteration = rounds.length;
  const unresolved = lastBoardroom?.verdict.unresolved_issues.length ?? 0;
  blackboard.promote(spec.number, currentDraft);
  onEvent?.('chapter_promoted', {
    chapter: spec.number,
    finalIteration,
    forcedPromote,
    unresolvedIssuesCount: unresolved,
  });

  return {
    chapterNumber: spec.number,
    finalText: currentDraft,
    rounds,
    totalIterations: finalIteration,
    forcedPromote,
    unresolvedIssuesCount: unresolved,
  };
}

async function callWriter(
  model: string,
  userPrompt: string,
  isRevision: boolean,
  onCost: CostCallback | undefined,
  chapterNumber: number
): Promise<string> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Writer timeout cap ${chapterNumber}`)), WRITER_TIMEOUT_MS)
  );

  const apiCall = (async () => {
    const response = await openrouter.chat.completions.create({
      model,
      max_tokens: WRITER_MAX_TOKENS,
      temperature: isRevision ? 0.5 : 0.4,
      frequency_penalty: 0.3,
      stream: false,
      messages: [
        { role: 'system', content: WRITER_SYSTEM_BASE },
        { role: 'user', content: userPrompt },
      ],
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) as OpenAI.ChatCompletion;

    onCost?.(model, response.usage, `writer/cap_${chapterNumber}${isRevision ? '_revise' : ''}`);
    return (response.choices?.[0]?.message?.content as string) || '';
  })();

  return Promise.race([apiCall, timeout]);
}

function summarizeCritiques(critiques: import('./types').CritiqueMessage[]): string {
  if (critiques.length === 0) return '';
  return critiques
    .slice(0, 12)
    .map((c) => `- [${c.agent}/${c.severity}] ${c.claim}`)
    .join('\n');
}
