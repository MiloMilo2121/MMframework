/**
 * Writer prompt builders for the boardroom critique loop.
 * - Round 1 (clean): writes from outline + ledger slice + thesis
 * - Round 2+ (revise): writes from previous draft + RevisionBrief
 *
 * Reuses GHOSTWRITER_SYSTEM as the base style guide; appends additional
 * style guards (must_avoid phrases) and revision instructions when relevant.
 */
import { GHOSTWRITER_SYSTEM } from '@/lib/ai/ghostwriter';
import type { ChapterOutline, RevisionBrief, StrategyThesis } from '@/lib/agents/types';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';

export const WRITER_SYSTEM_BASE = `${GHOSTWRITER_SYSTEM}

REGOLE BOARDROOM:
- Onora la TESI CENTRALE in ogni paragrafo (vedi user prompt).
- Segui l'OUTLINE sub-point per sub-point, rispettando target_words.
- Cita data_anchors specifici dal ledger; se un anchor manca, scrivi una riga "[GAP: …]".
- Applica il framework_lens del sub-point quando indicato (con il suo nome esplicito).
- Sviluppa gli innovation_hooks: ogni capitolo ha almeno 1 frase "wow" non boilerplate.
- Vietate categoricamente le frasi nel must_avoid.`;

interface WriterUserPromptParams {
  spec: ChapterSpec;
  outline: ChapterOutline;
  thesis: StrategyThesis;
  ledgerSlice: string;
  frameworksBlock: string;
  previousChaptersSummary: string;
  iteration: number;
  previousDraft?: string;
  revisionBrief?: RevisionBrief;
}

export function buildWriterUserPrompt(params: WriterUserPromptParams): string {
  const isRevision = params.iteration > 1 && params.previousDraft && params.revisionBrief;

  const subPointsBlock = params.outline.sub_points
    .map(
      (sp, i) =>
        `${i + 1}. **${sp.title}** (~${sp.target_words} parole)\n   - Anchor: ${sp.data_anchors.join(' | ')}${sp.framework_lens ? `\n   - Framework lens: ${sp.framework_lens}` : ''}`
    )
    .join('\n');

  const parts: string[] = [];

  if (isRevision && params.revisionBrief) {
    parts.push(`⚠️ REVISIONE — DRAFT v${params.iteration}. Stai correggendo la versione precedente.`);
    parts.push('');
    parts.push('=== MUST FIX (blocker + major) ===');
    if (params.revisionBrief.must_fix.length === 0) {
      parts.push('(nessuna)');
    } else {
      params.revisionBrief.must_fix.forEach((c) => {
        parts.push(`- [${c.agent}/${c.severity}] ${c.claim}`);
        if (c.evidence) parts.push(`    evidence: "${c.evidence.slice(0, 200)}"`);
        parts.push(`    fix: ${c.suggestion}`);
      });
    }
    parts.push('');
    if (params.revisionBrief.should_consider.length > 0) {
      parts.push('=== SHOULD CONSIDER (minor) ===');
      params.revisionBrief.should_consider.forEach((c) => {
        parts.push(`- [${c.agent}] ${c.suggestion}`);
      });
      parts.push('');
    }
    if (params.revisionBrief.insights_to_inject.length > 0) {
      parts.push('=== INSIGHT DA INIETTARE ===');
      params.revisionBrief.insights_to_inject.forEach((i) => parts.push(`- ${i}`));
      parts.push('');
    }
    if (params.revisionBrief.do_not.length > 0) {
      parts.push('=== DO NOT (frasi specifiche da NON usare) ===');
      params.revisionBrief.do_not.forEach((p) => parts.push(`- "${p}"`));
      parts.push('');
    }
    parts.push('=== DRAFT PRECEDENTE (correggi senza riscrivere da zero ciò che funziona) ===');
    parts.push(params.previousDraft!.slice(0, 8000));
    parts.push('');
  }

  parts.push(`CAPITOLO: CAP ${params.spec.number} — ${params.spec.title}`);
  parts.push(`Target: ${params.spec.target_word_count} parole`);
  parts.push('');
  parts.push('=== TESI CENTRALE ===');
  parts.push(params.thesis.central_thesis);
  parts.push('');
  parts.push('=== ANGOLO NARRATIVO ===');
  parts.push(params.thesis.narrative_angle);
  parts.push('');
  parts.push('=== OUTLINE — sub-points DA RISPETTARE ===');
  parts.push(subPointsBlock);
  parts.push('');
  parts.push(`Thesis link: ${params.outline.thesis_link}`);
  if (params.outline.innovation_hooks.length > 0) {
    parts.push('Innovation hooks da sviluppare:');
    params.outline.innovation_hooks.forEach((h) => parts.push(`- ${h}`));
  }
  parts.push('');
  if (params.thesis.must_avoid.length > 0) {
    parts.push('=== FRASI VIETATE (must_avoid) ===');
    params.thesis.must_avoid.forEach((p) => parts.push(`- "${p}"`));
    parts.push('');
  }
  if (params.frameworksBlock) {
    parts.push('=== FRAMEWORK DI RIFERIMENTO ===');
    parts.push(params.frameworksBlock.slice(0, 4000));
    parts.push('');
  }
  parts.push('=== LEDGER SLICE (dati disponibili) ===');
  parts.push(params.ledgerSlice.slice(0, 12000));
  parts.push('');
  if (params.previousChaptersSummary) {
    parts.push('=== CAPITOLI PRECEDENTI (NON ripetere questi concetti) ===');
    parts.push(params.previousChaptersSummary.slice(0, 4000));
    parts.push('');
  }
  parts.push('Scrivi SOLO il corpo del capitolo (no titolo, no preambolo). Rispetta target word count ±10%.');

  return parts.join('\n');
}
