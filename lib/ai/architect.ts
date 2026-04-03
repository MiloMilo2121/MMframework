/**
 * Architect — Tier 2 reasoning model generates the hierarchical DocumentPlan.
 *
 * This module is the ONLY place that calls MODEL_TIERS.ARCHITECT.
 * It never writes prose — only generates the structural JSON index.
 */
import { callOpenRouter, MODEL_TIERS } from './openrouter';
import { ARCHITECT_SYSTEM, buildArchitectPrompt } from './prompts/step2-architect';
import {
  parseDocumentPlan,
  buildDefaultPlan,
  type DocumentPlan,
} from '@/lib/parsers/document-plan';
import type { AnalysisVectorConfig } from '@/lib/types/analysis';

/**
 * Generates the hierarchical DocumentPlan using the ARCHITECT model.
 *
 * Fallback chain:
 * 1. Architect LLM call → Zod validation
 * 2. Single correction attempt (send back Zod errors)
 * 3. buildDefaultPlan(effort_tier) — static safe plan, never throws
 */
export async function generateHierarchicalIndex(
  ledgerSummary: string,
  config: AnalysisVectorConfig,
  clientName: string,
  sector: string
): Promise<DocumentPlan> {
  const userPrompt = buildArchitectPrompt(ledgerSummary, config, clientName, sector);

  // ── Attempt 1: primary Architect call ─────────────────────────────────────
  let rawText = '';
  try {
    rawText = await callOpenRouter({
      model: MODEL_TIERS.ARCHITECT,
      systemPrompt: ARCHITECT_SYSTEM,
      maxTokens: 6000,
      temperature: 0,      // deterministic — structure matters, not creativity
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (err) {
    console.error('[Architect] Primary call failed:', err instanceof Error ? err.message : err);
    return buildDefaultPlan(config.effort_tier);
  }

  const { data, error } = parseDocumentPlan(rawText);
  if (data) {
    console.log(`[Architect] Plan generated: ${data.macro_sections.length} sections, ${countSubs(data)} sub-chapters`);
    return data;
  }

  // ── Attempt 2: auto-correction ────────────────────────────────────────────
  console.warn(`[Architect] Zod validation failed (${error}) — attempting auto-correction...`);
  try {
    const correctionText = await callOpenRouter({
      model: MODEL_TIERS.ARCHITECT,
      maxTokens: 6000,
      temperature: 0,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: rawText },
        {
          role: 'user',
          content: `Il JSON prodotto ha errori di validazione: ${error}\n\nCorreggi e restituisci SOLO il JSON corretto, nient'altro.`,
        },
      ],
    });
    const { data: corrected } = parseDocumentPlan(correctionText);
    if (corrected) {
      console.log(`[Architect] Auto-correction succeeded: ${countSubs(corrected)} sub-chapters`);
      return corrected;
    }
  } catch (err) {
    console.error('[Architect] Auto-correction failed:', err instanceof Error ? err.message : err);
  }

  // ── Fallback: static plan ─────────────────────────────────────────────────
  console.warn('[Architect] Using static fallback plan for tier', config.effort_tier);
  return buildDefaultPlan(config.effort_tier);
}

function countSubs(plan: DocumentPlan): number {
  return plan.macro_sections.reduce((acc, s) => acc + s.sub_chapters.length, 0);
}
