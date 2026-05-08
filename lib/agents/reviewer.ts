import { callOpenRouter } from '@/lib/ai/openrouter';
import { REVIEWER_SYSTEMS, buildReviewerUserPrompt } from '@/lib/ai/prompts/reviewers';
import { extractJson } from '@/lib/parsers/extract-json';
import {
  CritiqueMessageSchema,
  type CritiqueMessage,
  type ReviewerId,
  type CostCallback,
  type StrategyThesis,
  type ChapterOutline,
} from './types';
import { z } from 'zod';

const REVIEWER_MODELS: Record<ReviewerId, string> = {
  fact_checker: process.env.REVIEWER_HAIKU_MODEL || 'anthropic/claude-haiku-4-5-20251001',
  coherence_auditor: process.env.REVIEWER_SONNET_MODEL || 'anthropic/claude-sonnet-4-6',
  strategy_critic: process.env.REVIEWER_SONNET_MODEL || 'anthropic/claude-sonnet-4-6',
  innovation_scout: process.env.REVIEWER_OPUS_MODEL || 'anthropic/claude-opus-4-7',
  reality_breaker: process.env.REVIEWER_SONNET_MODEL || 'anthropic/claude-sonnet-4-6',
  style_editor: process.env.REVIEWER_HAIKU_MODEL || 'anthropic/claude-haiku-4-5-20251001',
  source_validator: process.env.REVIEWER_HAIKU_MODEL || 'anthropic/claude-haiku-4-5-20251001',
};

const ReviewerOutputSchema = z.array(CritiqueMessageSchema);

interface RunReviewerParams {
  reviewerId: ReviewerId;
  thesis: StrategyThesis;
  outline: ChapterOutline;
  outlineMarkdown: string;
  ledgerSlice: string;
  previousChaptersSummary: string;
  draft: string;
  iteration: number;
  priorCritiquesSummary: string;
  model?: string;
  onCost?: CostCallback;
}

export interface ReviewerResult {
  reviewerId: ReviewerId;
  critiques: CritiqueMessage[];
  rawText: string;
  parseError: string | null;
  durationMs: number;
}

/**
 * Runs a single reviewer agent. Returns array of CritiqueMessage (possibly empty).
 * Errors and parse failures degrade gracefully to an empty critique list so the
 * Chair can still aggregate.
 */
export async function runReviewer(params: RunReviewerParams): Promise<ReviewerResult> {
  const startedAt = Date.now();
  const reviewerId = params.reviewerId;
  const model = params.model ?? REVIEWER_MODELS[reviewerId];
  const systemPrompt = REVIEWER_SYSTEMS[reviewerId];

  const userPrompt = buildReviewerUserPrompt({
    reviewerId,
    centralThesis: params.thesis.central_thesis,
    narrativeAngle: params.thesis.narrative_angle,
    mustAddress: params.thesis.must_address,
    mustAvoid: params.thesis.must_avoid,
    outline: params.outlineMarkdown,
    ledgerSlice: params.ledgerSlice,
    previousChaptersSummary: params.previousChaptersSummary,
    draft: params.draft,
    iteration: params.iteration,
    priorCritiquesSummary: params.priorCritiquesSummary,
  });

  let rawText = '';
  let parseError: string | null = null;
  let critiques: CritiqueMessage[] = [];

  try {
    rawText = await callOpenRouter({
      model,
      systemPrompt,
      systemPromptCached: true,
      maxTokens: 2048,
      temperature: 0.2,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (params.onCost) {
      const promptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      const completionTokens = Math.ceil(rawText.length / 4);
      params.onCost(model, { prompt_tokens: promptTokens, completion_tokens: completionTokens }, `reviewer/${reviewerId}`);
    }

    const json = JSON.parse(extractJson(rawText));
    const validated = ReviewerOutputSchema.parse(Array.isArray(json) ? json : []);
    critiques = validated.map((c) => ({ ...c, agent: reviewerId }));
  } catch (err) {
    parseError = err instanceof Error ? err.message : 'reviewer error';
    critiques = [];
  }

  return {
    reviewerId,
    critiques,
    rawText,
    parseError,
    durationMs: Date.now() - startedAt,
  };
}
