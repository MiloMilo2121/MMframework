/**
 * Ghostwriter helpers — tone builder and rolling summary generator.
 *
 * ROUTING: summarizeForNextChapter uses MODEL_TIERS.MINER (cheap, fast).
 * The actual Ghostwriter calls happen in the orchestrator using MODEL_TIERS.GHOSTWRITER.
 */
import { callOpenRouter, MODEL_TIERS } from './openrouter';
import type { AnalysisVectorConfig } from '@/lib/types/analysis';
import type { SubChapter, MacroSection } from '@/lib/parsers/document-plan';
import type { ResearchLedger } from '@/lib/types/research-ledger';

/**
 * Returns a compact tone-of-voice instruction block embedded in every
 * Ghostwriter sub-chapter prompt. Adapts to the target_audience vector.
 */
export function buildDynamicTone(audience: AnalysisVectorConfig['target_audience']): string {
  const lines: string[] = [];

  // Role-based framing
  lines.push(`LETTORE: ${audience.role} (${audience.age_bracket} anni).`);

  // Tech literacy guardrails
  if (audience.tech_literacy === 'low') {
    lines.push('LINGUAGGIO: ZERO tecnicismi inglesi. Niente acronimi senza spiegazione. Paragrafi max 3 righe. Preferisci analogie concrete al gergo di settore.');
  } else if (audience.tech_literacy === 'medium') {
    lines.push('LINGUAGGIO: Usa termini tecnici solo se strettamente necessari, sempre con contesto. Max 4 righe per paragrafo.');
  } else {
    lines.push('LINGUAGGIO: Livello tecnico alto accettato. Dati precisi, benchmark internazionali, terminologia specifica.');
  }

  // Cynicism / Avvocato del Diavolo mode
  if (audience.cynicism_level === 'high') {
    lines.push('TONO: AVVOCATO DEL DIAVOLO attivo. ZERO ottimismo non fondato. Ogni affermazione positiva deve avere un contrappeso di rischio. Cita solo fatti verificati con fonte. Se i dati non ci sono, di\' esplicitamente "dato non disponibile".');
  } else {
    lines.push('TONO: Equilibrato e diretto. Rischi reali senza catastrofismo. Opportunità concrete senza entusiasmo vuoto.');
  }

  // Universal writing rules
  lines.push('FORMATO: Bullet point dove possibile. Niente frasi introduttive tipo "In questo capitolo..." o "È importante notare che...". Vai diretto al punto.');
  lines.push('VIETATO: Sinergia, Ecosistema, Paradigma, Olistico, Disruptive, Game-changer, Innovativo (senza proof). Se usi una cifra, cita la fonte inline es. "(Fonte: Deloitte 2025)".');

  return lines.join('\n');
}

/**
 * Builds the full prompt for a single sub-chapter Ghostwriter call.
 */
export function buildSubChapterPrompt(params: {
  subChapter: SubChapter;
  section: MacroSection;
  clientName: string;
  sector: string;
  toneInstructions: string;
  rollingSummary: string;
  contextJson: string;
}): string {
  const { subChapter, section, clientName, sector, toneInstructions, rollingSummary, contextJson } = params;

  return `CLIENTE: ${clientName} — SETTORE: ${sector}

${toneInstructions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUTTURA DOCUMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stai scrivendo il sub-capitolo ${subChapter.sub_number} all'interno della sezione "${section.section_title}".
Titolo: "${subChapter.title}"
Target: ${subChapter.target_words} parole (±15%).

DIRETTIVE SPECIFICHE:
${subChapter.ghostwriter_instructions}

METRICHE OBBLIGATORIE (devono apparire nel testo con valore e fonte):
${subChapter.must_include_metrics.length > 0 ? subChapter.must_include_metrics.map((m) => `- ${m}`).join('\n') : '(nessuna metrica obbligatoria — scrivi liberamente sui dati disponibili)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTESTO PRECEDENTE (NON RIPETERE questi concetti)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rollingSummary || 'Nessun contesto precedente — è il primo sub-capitolo.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATI ESTRATTI DAI MINER (cita sempre la fonte inline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${contextJson || 'Nessun dato specifico disponibile per questa area — basa l\'analisi sul contesto generale del settore.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INIZIA A SCRIVERE IL SUB-CAPITOLO DIRETTAMENTE.
Non scrivere "## ${subChapter.sub_number} ${subChapter.title}" — il titolo viene aggiunto automaticamente.`;
}

/**
 * Generates a 3-bullet rolling summary of the last sub-chapter written.
 * Uses MODEL_TIERS.MINER (cheap) — ~200 token output, sequential call.
 *
 * The rolling summary prevents the Ghostwriter from repeating concepts
 * across consecutive sub-chapters in a 50-sub-chapter document.
 */
export async function summarizeForNextChapter(subChapterText: string): Promise<string> {
  if (subChapterText.length < 100) return '';

  try {
    const summary = await callOpenRouter({
      model: MODEL_TIERS.MINER,
      maxTokens: 200,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: `Riassumi in 3 bullet point (max 25 parole ciascuno) i CONCETTI CHIAVE già trattati nel seguente testo. Sii sintetico — serve solo come memoria per il prossimo capitolo:\n\n${subChapterText.slice(0, 3000)}`,
        },
      ],
    });
    return summary.trim();
  } catch (err) {
    // Rolling summary failure is non-fatal — Ghostwriter continues without context
    console.warn('[Ghostwriter] summarizeForNextChapter failed:', err instanceof Error ? err.message : err);
    return '';
  }
}

/**
 * Builds the isolated HANDOFF_OPERATIVO extraction prompt.
 * Called AFTER the full report is assembled — one clean, focused call.
 */
export function buildHandoffExtractionPrompt(
  finalReportMarkdown: string,
  clientName: string,
  sector: string
): string {
  const reportTail = finalReportMarkdown.slice(-20_000);
  return `Dal report di analisi di mercato per ${clientName} (settore: ${sector}), estrai ESCLUSIVAMENTE il JSON dell'HANDOFF_OPERATIVO.

Il JSON deve seguire questo schema:
{
  "version": "2.0",
  "generated_at": "<ISO timestamp>",
  "client": "<nome cliente>",
  "strategic_choices": { ... },
  "messages": [ ... ],
  "immediate_tests": [ ... ],
  "roadmap": { "h1_30d": [...], "h1_60d": [...], "h2_90d": [...] },
  "top_risks": [ ... ],
  "micro_segments": [ ... ],
  "critical_gaps": [ ... ]
}

Output: SOLO il blocco \`\`\`json ... \`\`\`. Zero testo aggiuntivo.

ESTRATTO REPORT:
${reportTail}`;
}
