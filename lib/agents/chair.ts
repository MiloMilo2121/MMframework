import { callOpenRouter } from '@/lib/ai/openrouter';
import { CHAIR_SYSTEM, buildChairUserPrompt } from '@/lib/ai/prompts/chair';
import { extractJson } from '@/lib/parsers/extract-json';
import {
  VerdictSchema,
  RevisionBriefSchema,
  SEVERITY_RANK,
  type CritiqueMessage,
  type Verdict,
  type RevisionBrief,
  type Severity,
  type CostCallback,
} from './types';
import { z } from 'zod';

const ChairOutputSchema = z.object({
  verdict: VerdictSchema,
  brief: RevisionBriefSchema,
});

interface AggregateVerdictParams {
  critiques: CritiqueMessage[];
  iteration: number;
  maxIterations: number;
  chapterTitle: string;
  model?: string;
  onCost?: CostCallback;
}

/**
 * Calls the Chair LLM to aggregate critiques into a single verdict + revision brief.
 * If the LLM call fails, falls back to a deterministic rule-based aggregation.
 */
export async function aggregateVerdict(params: AggregateVerdictParams): Promise<{
  verdict: Verdict;
  brief: RevisionBrief;
  rawText: string;
  parseError: string | null;
}> {
  const model = params.model ?? process.env.CHAIR_MODEL ?? 'anthropic/claude-sonnet-4-6';
  const critiquesJson = JSON.stringify(params.critiques, null, 2);
  const userPrompt = buildChairUserPrompt({
    iteration: params.iteration,
    maxIterations: params.maxIterations,
    critiquesJson: critiquesJson.slice(0, 12000),
    chapterTitle: params.chapterTitle,
  });

  let rawText = '';
  let parseError: string | null = null;

  try {
    rawText = await callOpenRouter({
      model,
      systemPrompt: CHAIR_SYSTEM,
      systemPromptCached: true,
      maxTokens: 4096,
      temperature: 0.1,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (params.onCost) {
      const promptTokens = Math.ceil((CHAIR_SYSTEM.length + userPrompt.length) / 4);
      const completionTokens = Math.ceil(rawText.length / 4);
      params.onCost(model, { prompt_tokens: promptTokens, completion_tokens: completionTokens }, 'chair');
    }

    const parsed = ChairOutputSchema.parse(JSON.parse(extractJson(rawText)));
    return { verdict: parsed.verdict, brief: parsed.brief, rawText, parseError: null };
  } catch (err) {
    parseError = err instanceof Error ? err.message : 'chair parse error';
    const fallback = ruleBasedAggregate(params.critiques, params.iteration, params.maxIterations);
    return { ...fallback, rawText, parseError };
  }
}

/**
 * Deterministic fallback when the Chair LLM fails. Applies the policy rules
 * directly: blockers => REVISE, majors > 2 => REVISE, else PROMOTE; forced
 * PROMOTE if iteration == maxIterations.
 */
export function ruleBasedAggregate(
  critiques: CritiqueMessage[],
  iteration: number,
  maxIterations: number
): { verdict: Verdict; brief: RevisionBrief } {
  const blockers = critiques.filter((c) => c.severity === 'blocker');
  const majors = critiques.filter((c) => c.severity === 'major');
  const minors = critiques.filter((c) => c.severity === 'minor');

  let topSeverity: Severity = 'none';
  for (const c of critiques) {
    if (SEVERITY_RANK[c.severity] > SEVERITY_RANK[topSeverity]) topSeverity = c.severity;
  }

  const reachedMax = iteration >= maxIterations;
  let decision: 'PROMOTE' | 'REVISE' | 'ESCALATE' = 'PROMOTE';
  if (!reachedMax) {
    if (blockers.length > 0 || majors.length > 2) decision = 'REVISE';
  }

  const verdict: Verdict = {
    decision,
    severity: topSeverity,
    iteration,
    unresolved_issues: decision === 'PROMOTE' && (blockers.length > 0 || majors.length > 0)
      ? [...blockers, ...majors]
      : [],
    rationale: reachedMax && decision === 'PROMOTE' && (blockers.length || majors.length)
      ? 'Forced promotion: max iterations reached with unresolved issues.'
      : decision === 'REVISE'
      ? `Revision required: ${blockers.length} blockers, ${majors.length} majors.`
      : 'Approved: only minor or no issues.',
  };

  const insightsFromScout = critiques
    .filter((c) => c.agent === 'innovation_scout')
    .map((c) => c.suggestion);
  const doNotFromStyle = critiques
    .filter((c) => c.agent === 'style_editor' && c.evidence)
    .map((c) => c.evidence!);

  const brief: RevisionBrief = {
    must_fix: [...blockers, ...majors],
    should_consider: minors,
    insights_to_inject: insightsFromScout.slice(0, 5),
    do_not: doNotFromStyle.slice(0, 8),
  };

  return { verdict, brief };
}
