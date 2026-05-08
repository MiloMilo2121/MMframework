import { runReviewer, type ReviewerResult } from './reviewer';
import { aggregateVerdict } from './chair';
import {
  type ReviewerId,
  type CritiqueMessage,
  type StrategyThesis,
  type ChapterOutline,
  type CostCallback,
  type Verdict,
  type RevisionBrief,
} from './types';

/**
 * Round 1 = triage panel (cheap reviewers only). Used to fast-track clean drafts.
 * If the triage panel finds blockers/majors, the loop escalates to full panel
 * in round 2.
 */
const TRIAGE_PANEL: ReviewerId[] = ['fact_checker', 'coherence_auditor', 'style_editor', 'source_validator'];

const FULL_PANEL: ReviewerId[] = [
  'fact_checker',
  'coherence_auditor',
  'strategy_critic',
  'innovation_scout',
  'reality_breaker',
  'style_editor',
  'source_validator',
];

interface RunBoardroomParams {
  draft: string;
  thesis: StrategyThesis;
  outline: ChapterOutline;
  outlineMarkdown: string;
  ledgerSlice: string;
  previousChaptersSummary: string;
  iteration: number;
  maxIterations: number;
  chapterTitle: string;
  innovationCritical?: boolean;
  priorCritiquesSummary?: string;
  onCost?: CostCallback;
  onReviewerEvent?: (event: 'started' | 'complete', data: { reviewerId: ReviewerId; result?: ReviewerResult }) => void;
}

export interface BoardroomResult {
  iteration: number;
  panel: ReviewerId[];
  reviewers: ReviewerResult[];
  critiques: CritiqueMessage[];
  verdict: Verdict;
  brief: RevisionBrief;
  durationMs: number;
}

/**
 * Picks the reviewer panel for the current iteration:
 * - Round 1: triage panel (cheap Haiku-heavy)
 * - Round 2+: full panel
 * - innovation_critical chapters always include innovation_scout from round 1
 */
function pickPanel(iteration: number, innovationCritical: boolean): ReviewerId[] {
  if (iteration === 1) {
    return innovationCritical ? [...TRIAGE_PANEL, 'innovation_scout'] : TRIAGE_PANEL;
  }
  return FULL_PANEL;
}

/**
 * Runs the Boardroom: launches the appropriate reviewer panel in parallel,
 * collects all critiques, then calls the Chair to aggregate.
 * Returns a complete BoardroomResult ready to feed back into the critique loop.
 */
export async function runBoardroom(params: RunBoardroomParams): Promise<BoardroomResult> {
  const startedAt = Date.now();
  const panel = pickPanel(params.iteration, params.innovationCritical ?? false);

  const reviewerResults = await Promise.all(
    panel.map((reviewerId) => {
      params.onReviewerEvent?.('started', { reviewerId });
      return runReviewer({
        reviewerId,
        thesis: params.thesis,
        outline: params.outline,
        outlineMarkdown: params.outlineMarkdown,
        ledgerSlice: params.ledgerSlice,
        previousChaptersSummary: params.previousChaptersSummary,
        draft: params.draft,
        iteration: params.iteration,
        priorCritiquesSummary: params.priorCritiquesSummary ?? '',
        onCost: params.onCost,
      }).then((result) => {
        params.onReviewerEvent?.('complete', { reviewerId, result });
        return result;
      });
    })
  );

  const critiques = reviewerResults.flatMap((r) => r.critiques);

  const { verdict, brief } = await aggregateVerdict({
    critiques,
    iteration: params.iteration,
    maxIterations: params.maxIterations,
    chapterTitle: params.chapterTitle,
    onCost: params.onCost,
  });

  return {
    iteration: params.iteration,
    panel,
    reviewers: reviewerResults,
    critiques,
    verdict,
    brief,
    durationMs: Date.now() - startedAt,
  };
}

export { TRIAGE_PANEL, FULL_PANEL };
