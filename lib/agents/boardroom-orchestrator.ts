import { Blackboard } from './blackboard';
import { runStrategist } from './strategist';
import { runOutliner } from './outliner';
import { writeChapterWithCritique } from './critique-loop';
import { selectFrameworks, buildFrameworksPromptBlock } from '@/lib/rag/lookup';
import { extractLedgerSlice } from '@/lib/ai/ghostwriter';
import { SSE_EVENT } from '@/lib/ai/sse-events';
import type { ResearchLedger } from '@/lib/types/research-ledger';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';
import type { CostCallback, FrameworkEntry, ReviewerId } from './types';

export interface BoardroomPipelineParams {
  clientName: string;
  sector: string;
  geography: string;
  ledger: ResearchLedger;
  ledgerSummary: string;
  handoffData1Excerpt: string;
  questionnaireExcerpt?: string;
  chapterSpecs: ChapterSpec[];
  maxIterations?: number;
  innovationCriticalChapters?: number[];
  send: (event: string, data: Record<string, unknown>) => void;
  onCost?: CostCallback;
  shouldStop?: () => boolean;
}

export interface BoardroomPipelineResult {
  chapterTexts: string[];
  blackboard: Blackboard;
  selectedFrameworks: FrameworkEntry[];
}

/**
 * Runs the Boardroom pipeline (Strategist + Outliner + per-chapter critique loop).
 * Called from the orchestrator route AFTER Phase B (Workers+Challenger) and Phase C
 * (Architect) have run, so we have a populated ledger and chapter specs.
 *
 * Chapters are written sequentially (not in parallel batches like the legacy
 * ghostwriter) to allow the Coherence Auditor to see previously-promoted chapters.
 */
export async function runBoardroomPipeline(
  params: BoardroomPipelineParams
): Promise<BoardroomPipelineResult> {
  const {
    clientName,
    sector,
    geography,
    ledger,
    ledgerSummary,
    handoffData1Excerpt,
    questionnaireExcerpt,
    chapterSpecs,
    maxIterations = 3,
    innovationCriticalChapters = [],
    send,
    onCost,
    shouldStop,
  } = params;

  const blackboard = new Blackboard();
  blackboard.setLedger(ledger);
  blackboard.setChapters(chapterSpecs);

  // Phase 2: RAG framework selection
  send(SSE_EVENT.STATUS, { phase: 'rag', message: '📚 Selezione framework rilevanti...', step: 'rag_start' });
  const briefForRag = `${clientName} ${sector} ${handoffData1Excerpt.slice(0, 1500)}`;
  const frameworks = await selectFrameworks({
    brief: briefForRag,
    sector,
    topK: 4,
  });
  blackboard.setFrameworks(frameworks);
  send(SSE_EVENT.RAG_LOOKUP_COMPLETE, {
    selectedFrameworks: frameworks.map((f) => ({ id: f.id, name: f.name, category: f.category })),
  });

  // Phase 3a: Strategist
  send(SSE_EVENT.STATUS, { phase: 'strategist', message: '🎯 Strategist: definizione tesi centrale...', step: 'strategist_start' });
  const strategistResult = await runStrategist({
    clientName,
    sector,
    geography,
    ledgerSummary,
    handoffData1Excerpt,
    questionnaireExcerpt,
    frameworks,
    onCost,
  });
  blackboard.setStrategy(strategistResult.thesis);
  if (strategistResult.parseError) {
    send(SSE_EVENT.WARNING, {
      message: `⚠️ Strategist parse error: ${strategistResult.parseError}`,
      code: 'STRATEGIST_PARSE_ERROR',
    });
  }
  send(SSE_EVENT.STRATEGY_THESIS_READY, {
    thesis: strategistResult.thesis.central_thesis,
    angle: strategistResult.thesis.narrative_angle,
    positioning: strategistResult.thesis.positioning_statement,
    selectedFrameworks: strategistResult.thesis.selected_frameworks,
    contrarianInsights: strategistResult.thesis.contrarian_insights,
  });

  // Phase 3b: Outliner per chapter (sequential — needs previous chapter titles to dedup)
  send(SSE_EVENT.STATUS, { phase: 'outliner', message: '📋 Outliner: piano dettagliato per capitolo...', step: 'outliner_start' });
  const previousTitles: string[] = [];
  for (const spec of chapterSpecs) {
    if (shouldStop?.()) {
      send(SSE_EVENT.WARNING, { message: '⛔ Stop richiesto durante outline.', code: 'STOPPED_OUTLINE' });
      break;
    }
    const ledgerSlice = extractLedgerSlice(spec, ledger);
    const result = await runOutliner({
      spec,
      thesis: strategistResult.thesis,
      ledgerSlice,
      frameworks,
      previousChapterTitles: previousTitles.slice(),
      onCost,
    });
    blackboard.setOutline(spec.number, result.outline);
    previousTitles.push(spec.title);
    send(SSE_EVENT.OUTLINE_READY, {
      chapter: spec.number,
      title: spec.title,
      subPointsCount: result.outline.sub_points.length,
      thesisLink: result.outline.thesis_link,
    });
    if (result.parseError) {
      send(SSE_EVENT.WARNING, {
        message: `⚠️ Outline cap ${spec.number} parse error: ${result.parseError}`,
        code: 'OUTLINE_PARSE_ERROR',
      });
    }
  }

  // Phase 4: Writer ↔ Boardroom loop per chapter (sequential)
  send(SSE_EVENT.STATUS, {
    phase: 'boardroom',
    message: `✍️ Boardroom loop su ${chapterSpecs.length} capitoli (max ${maxIterations} iter)...`,
    step: 'boardroom_start',
  });

  const chapterTexts: string[] = new Array(chapterSpecs.length).fill('');

  for (let i = 0; i < chapterSpecs.length; i++) {
    if (shouldStop?.()) {
      send(SSE_EVENT.WARNING, { message: '⛔ Stop budget durante boardroom.', code: 'STOPPED_BOARDROOM' });
      break;
    }
    const spec = chapterSpecs[i];
    const innovationCritical = innovationCriticalChapters.includes(spec.number) || /executive|raccomandaz|handoff/i.test(spec.title);

    send(SSE_EVENT.CHAPTER_START, { number: spec.number, title: spec.title });

    try {
      const result = await writeChapterWithCritique({
        spec,
        blackboard,
        frameworks,
        maxIterations,
        innovationCritical,
        onCost,
        onEvent: (event, data) => send(event, data),
        onReviewerEvent: (kind, data) => {
          send(kind === 'started' ? SSE_EVENT.REVIEWER_STARTED : SSE_EVENT.REVIEWER_COMPLETE, {
            chapter: spec.number,
            reviewerId: data.reviewerId,
          });
        },
      });
      chapterTexts[i] = result.finalText;
      const wordCount = result.finalText.split(/\s+/).filter(Boolean).length;
      send(SSE_EVENT.CHAPTER_COMPLETE, {
        number: spec.number,
        title: spec.title,
        text: result.finalText,
        wordCount,
        durationMs: result.rounds.reduce((s, r) => s + (r.durationMs ?? 0), 0),
        rounds: result.rounds.length,
        forcedPromote: result.forcedPromote,
        unresolvedIssuesCount: result.unresolvedIssuesCount,
      });
      send(SSE_EVENT.AGENT_DIALOG, {
        chapter: spec.number,
        rounds: result.rounds,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      chapterTexts[i] = `## ${spec.title}\n\n[Capitolo non generato: ${msg}]`;
      send(SSE_EVENT.WARNING, {
        message: `⚠️ Cap ${spec.number} fallito: ${msg}`,
        code: 'CHAPTER_BOARDROOM_ERROR',
      });
    }
  }

  return { chapterTexts, blackboard, selectedFrameworks: frameworks };
}

export function pickInnovationCriticalChapters(specs: ChapterSpec[]): number[] {
  const result: number[] = [];
  if (specs.length === 0) return result;
  // Always: first chapter (executive summary) and last 2 (recommendations + handoff)
  result.push(specs[0].number);
  if (specs.length > 1) result.push(specs[specs.length - 1].number);
  if (specs.length > 2) result.push(specs[specs.length - 2].number);
  // Plus chapters with "raccomandaz" or "strategia" in title
  for (const s of specs) {
    if (/raccomandaz|strategi|posizionament|tesi/i.test(s.title) && !result.includes(s.number)) {
      result.push(s.number);
    }
  }
  return result;
}

export const BOARDROOM_FEATURE_FLAG = 'USE_BOARDROOM';

export function isBoardroomEnabled(): boolean {
  return process.env[BOARDROOM_FEATURE_FLAG] === 'true' || process.env[BOARDROOM_FEATURE_FLAG] === '1';
}

export type { ReviewerId };
