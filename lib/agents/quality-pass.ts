import { callOpenRouter } from '@/lib/ai/openrouter';
import { COHERENCE_PASS_SYSTEM, buildCoherencePassPrompt } from '@/lib/ai/prompts/coherence-pass';
import { extractJson } from '@/lib/parsers/extract-json';
import { z } from 'zod';
import type { CostCallback } from './types';

export const CoherenceReportSchema = z.object({
  wow_score: z.number().min(1).max(10),
  wow_rationale: z.string(),
  thesis_consistency: z.enum(['FULL', 'PARTIAL', 'WEAK']),
  coverage: z.array(z.object({
    must_address: z.string(),
    status: z.enum(['covered', 'partial', 'missing']),
    chapter_ref: z.string().nullable(),
  })),
  contradictions: z.array(z.object({
    chapter_a: z.string(),
    chapter_b: z.string(),
    issue: z.string(),
    severity: z.enum(['minor', 'major', 'blocker']),
  })),
  boilerplate_flags: z.array(z.string()),
  summary: z.string(),
});
export type CoherenceReport = z.infer<typeof CoherenceReportSchema>;

interface RunCoherencePassParams {
  clientName: string;
  sector: string;
  centralThesis: string;
  mustAddress: string[];
  fullReport: string;
  model?: string;
  onCost?: CostCallback;
}

/**
 * Final pass: a senior-partner-level coherence check across the full report.
 * One Sonnet call. Returns CoherenceReport, or a degraded fallback on failure.
 */
export async function runFinalCoherencePass(params: RunCoherencePassParams): Promise<{
  report: CoherenceReport;
  rawText: string;
  parseError: string | null;
}> {
  const model = params.model ?? process.env.COHERENCE_PASS_MODEL ?? 'anthropic/claude-sonnet-4-6';
  const userPrompt = buildCoherencePassPrompt({
    clientName: params.clientName,
    sector: params.sector,
    centralThesis: params.centralThesis,
    mustAddress: params.mustAddress,
    fullReport: params.fullReport,
  });

  let rawText = '';
  let parseError: string | null = null;
  let report: CoherenceReport;

  try {
    rawText = await callOpenRouter({
      model,
      systemPrompt: COHERENCE_PASS_SYSTEM,
      systemPromptCached: true,
      maxTokens: 4096,
      temperature: 0.2,
      messages: [{ role: 'user', content: userPrompt }],
    });
    if (params.onCost) {
      const promptTokens = Math.ceil((COHERENCE_PASS_SYSTEM.length + userPrompt.length) / 4);
      const completionTokens = Math.ceil(rawText.length / 4);
      params.onCost(model, { prompt_tokens: promptTokens, completion_tokens: completionTokens }, 'coherence_pass');
    }
    report = CoherenceReportSchema.parse(JSON.parse(extractJson(rawText)));
  } catch (err) {
    parseError = err instanceof Error ? err.message : 'coherence pass error';
    report = {
      wow_score: 5,
      wow_rationale: 'Coherence pass failed — score di default.',
      thesis_consistency: 'PARTIAL',
      coverage: params.mustAddress.map((p) => ({ must_address: p, status: 'partial' as const, chapter_ref: null })),
      contradictions: [],
      boilerplate_flags: [],
      summary: 'Final coherence pass non disponibile per errore.',
    };
  }

  return { report, rawText, parseError };
}

const CONTRARIAN_PATTERNS = [
  /contrariamente a/i,
  /il dato sorprendente/i,
  /il consenso del settore/i,
  /controintuitivo/i,
  /counter[\s-]?intuitive/i,
  /a differenza di quanto si pensa/i,
  /la narrazione consensuale/i,
];

const FRAMEWORK_NAMES = [
  'porter',
  'jtbd',
  'jobs-to-be-done',
  'ansoff',
  'bcg',
  'blue ocean',
  'value chain',
  'north star',
  'wardley',
  'lean',
  'oee',
  'industry 4.0',
  'rfm',
  'rule of 40',
  'plg',
  'product-led',
  'abm',
  'challenger sale',
  'servqual',
  'ltv',
  'cac',
];

const URL_PATTERN = /https?:\/\/([a-z0-9.-]+)/gi;

const BOILERPLATE_PHRASES = [
  'approccio strutturato',
  'in un mondo sempre più',
  'le imprese di oggi',
  'occorre essere agili',
  'la trasformazione digitale è',
  'per affrontare le sfide del',
];

export interface InnovationScore {
  counter_intuitive_density: number; // 0-1
  avg_framework_citations_per_chapter: number;
  unique_source_domains: number;
  boilerplate_hits: number;
  composite_score: number; // 0-10
}

/**
 * Deterministic score over all chapter texts.
 * Cheap (no LLM call). Computes the structural innovation/quality signals.
 */
export function computeInnovationScore(chapterTexts: string[]): InnovationScore {
  const nonEmpty = chapterTexts.filter((t) => t && !t.startsWith('[Capitolo non generato'));
  const totalChapters = nonEmpty.length || 1;

  let chaptersWithContrarian = 0;
  let frameworkCitationsTotal = 0;
  const domains = new Set<string>();
  let boilerplateHits = 0;

  for (const text of nonEmpty) {
    if (CONTRARIAN_PATTERNS.some((re) => re.test(text))) chaptersWithContrarian++;
    const lowered = text.toLowerCase();
    for (const fw of FRAMEWORK_NAMES) {
      if (lowered.includes(fw)) frameworkCitationsTotal++;
    }
    let m: RegExpExecArray | null;
    URL_PATTERN.lastIndex = 0;
    while ((m = URL_PATTERN.exec(text)) !== null) {
      domains.add(m[1].toLowerCase());
    }
    for (const phrase of BOILERPLATE_PHRASES) {
      if (lowered.includes(phrase)) boilerplateHits++;
    }
  }

  const counter_intuitive_density = chaptersWithContrarian / totalChapters;
  const avg_framework_citations_per_chapter = frameworkCitationsTotal / totalChapters;
  const unique_source_domains = domains.size;

  // Composite (0-10): weights tuned for sensitivity.
  // CI density × 4 (max 4) + framework cit × 1 (cap 3) + domains/10 (cap 2) - boilerplate × 0.5 (cap 2)
  const ci = Math.min(4, counter_intuitive_density * 4);
  const fc = Math.min(3, avg_framework_citations_per_chapter * 1);
  const sd = Math.min(2, unique_source_domains / 10);
  const bp = Math.min(2, boilerplateHits * 0.5);
  const composite = Math.max(0, Math.min(10, 1 + ci + fc + sd - bp));

  return {
    counter_intuitive_density,
    avg_framework_citations_per_chapter,
    unique_source_domains,
    boilerplate_hits: boilerplateHits,
    composite_score: Number(composite.toFixed(2)),
  };
}
