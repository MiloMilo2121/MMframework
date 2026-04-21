/**
 * Ghostwriter — writes one chapter at a time, in parallel batches.
 *
 * Architecture:
 *   - Receives ChapterSpec[] from the Architect
 *   - Groups chapters into batches of BATCH_SIZE (default 4)
 *   - Writes each batch in parallel via Promise.allSettled
 *   - Each chapter call is isolated (fresh context) to prevent repetition
 *   - Passes a running summary of previous chapters for anti-repetition
 */
import { openrouter } from './openrouter';
import type OpenAI from 'openai';
import type { ChapterSpec } from './prompts/architect';
import type { ResearchLedger } from '@/lib/types/research-ledger';

const GHOSTWRITER_BATCH_SIZE = 4;
const CHAPTER_MAX_TOKENS = 3500;
const CHAPTER_TIMEOUT_MS = 60_000;
const WORD_COUNT_FLOOR = 0.6; // retry if text < 60% of target

export const GHOSTWRITER_SYSTEM = `Sei un ghostwriter senior specializzato in analisi di mercato per PMI italiane.
Ricevi una specifica di capitolo + dati di ricerca verificati + contesto strategico.
Il tuo compito: scrivere SOLO quel capitolo, con la massima densità informativa.

REGOLE ASSOLUTE:
1. Scrivi SOLO il corpo del capitolo — NON aggiungere il titolo (lo aggiunge il sistema).
2. Target word count: rispetta il numero indicato (±10%). Non fare padding.
3. Usa i dati del ledger forniti. Se mancano dati per un punto, dillo esplicitamente.
4. Stile PMI-Proof: frasi brevi, bullet points, dati con fonte, zero fuffa corporate.
5. NON ripetere concetti già coperti nei capitoli precedenti (vedi: previous_summary).
6. Chiudi con "**Implicazione operativa:**" seguita da 1-3 bullet azionabili (eccetto HANDOFF_OPERATIVO).

PAROLE VIETATE: Sinergia | Paradigma | Ecosistema | Resilienza | In conclusione | È importante notare`;

export interface GhostwriterCallbacks {
  onChapterStart: (spec: ChapterSpec) => void;
  onChapterComplete: (spec: ChapterSpec, text: string) => void;
  onChapterError: (spec: ChapterSpec, error: string) => void;
  /** Called after each LLM call with token usage for cost tracking */
  onCost?: (model: string, usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined, phase: string) => void;
  /** Return true to halt chapter writing (budget kill-switch) */
  shouldStop?: () => boolean;
}

/**
 * Write all chapters in parallel batches.
 * Returns ordered array of chapter texts.
 */
export async function writeChaptersBatched(
  chapters: ChapterSpec[],
  ledger: ResearchLedger,
  model: string,
  callbacks: GhostwriterCallbacks
): Promise<string[]> {
  const results: string[] = new Array(chapters.length).fill('');
  let previousSummary = '';

  for (let i = 0; i < chapters.length; i += GHOSTWRITER_BATCH_SIZE) {
    // Kill-switch: stop if budget exceeded
    if (callbacks.shouldStop?.()) {
      console.warn('[Ghostwriter] Budget kill-switch triggered — stopping chapter generation');
      break;
    }

    const batch = chapters.slice(i, i + GHOSTWRITER_BATCH_SIZE);
    const summaryForBatch = previousSummary; // all chapters BEFORE this batch

    const batchResults = await Promise.allSettled(
      batch.map((spec) => writeChapterWithRetry(spec, ledger, model, summaryForBatch, callbacks))
    );

    const batchTexts: string[] = [];
    for (let j = 0; j < batch.length; j++) {
      const r = batchResults[j];
      const idx = i + j;
      if (r.status === 'fulfilled') {
        results[idx] = r.value;
        batchTexts.push(`## ${batch[j].title}\n${r.value.slice(0, 400)}`);
      } else {
        const errMsg = r.reason instanceof Error ? r.reason.message : 'Unknown error';
        results[idx] = `## ${batch[j].title}\n\n[Capitolo non generato: ${errMsg}]`;
        callbacks.onChapterError(batch[j], errMsg);
        batchTexts.push(`## ${batch[j].title}\n[ERROR]`);
      }
    }

    // Update running summary for next batch
    if (batchTexts.length > 0) {
      previousSummary += '\n\n' + batchTexts.join('\n---\n');
      if (previousSummary.length > 8000) {
        previousSummary = previousSummary.slice(-8000);
      }
    }
  }

  return results;
}

async function writeChapterWithRetry(
  spec: ChapterSpec,
  ledger: ResearchLedger,
  model: string,
  previousSummary: string,
  callbacks: GhostwriterCallbacks
): Promise<string> {
  callbacks.onChapterStart(spec);
  const ledgerSlice = extractLedgerSlice(spec, ledger);

  let text = await callChapterApi(spec, model, previousSummary, ledgerSlice, false, callbacks);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const floor = Math.floor(spec.target_word_count * WORD_COUNT_FLOOR);

  if (wordCount < floor || text.trim().length === 0) {
    const retryPrompt = `ESPANDI — il testo prodotto (${wordCount} parole) è sotto il minimo richiesto (${floor} parole). Scrivi almeno ${spec.target_word_count} parole. Aggiungi dati concreti, esempi, analisi più profonda.`;
    const retryText = await callChapterApi(spec, model, previousSummary, ledgerSlice, true, callbacks, retryPrompt)
      .catch((err) => {
        console.warn(`[Ghostwriter] Retry failed for cap ${spec.number}: ${err instanceof Error ? err.message : 'unknown'}`);
        return '';
      });
    if (retryText.trim().length > text.trim().length) text = retryText;
  }

  callbacks.onChapterComplete(spec, text);
  return text;
}

async function callChapterApi(
  spec: ChapterSpec,
  model: string,
  previousSummary: string,
  ledgerSlice: string,
  isRetry: boolean,
  callbacks: GhostwriterCallbacks,
  retryPrefix?: string
): Promise<string> {
  const userPrompt = buildChapterPrompt(spec, ledgerSlice, previousSummary, retryPrefix);

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Chapter ${spec.number} timeout`)), CHAPTER_TIMEOUT_MS)
  );

  const apiCall = (async () => {
    const response = await openrouter.chat.completions.create({
      model,
      max_tokens: CHAPTER_MAX_TOKENS,
      temperature: isRetry ? 0.55 : 0.4,
      frequency_penalty: 0.3,
      stream: false,
      messages: [
        { role: 'system', content: GHOSTWRITER_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) as OpenAI.ChatCompletion;

    callbacks.onCost?.(model, response.usage, `ghostwriter/cap_${spec.number}${isRetry ? '_retry' : ''}`);
    return (response.choices?.[0]?.message?.content as string) || '';
  })();

  return Promise.race([apiCall, timeout]);
}

function buildChapterPrompt(
  spec: ChapterSpec,
  ledgerSlice: string,
  previousSummary: string,
  retryPrefix?: string
): string {
  const parts: string[] = [];

  if (retryPrefix) parts.push(`⚠️ ${retryPrefix}\n`);

  parts.push(
    `CAPITOLO DA SCRIVERE: CAP ${spec.number} — ${spec.title}`,
    `Target: ${spec.target_word_count} parole`,
    ``,
    `ISTRUZIONI SPECIFICHE:`,
    spec.focus_instructions,
    ``,
    `DATI DA USARE (Research Ledger):`,
    ledgerSlice.slice(0, 20000),
  );

  if (previousSummary.trim()) {
    parts.push(
      ``,
      `CAPITOLI GIÀ SCRITTI (NON ripetere questi concetti):`,
      previousSummary.slice(0, 6000)
    );
  }

  return parts.join('\n');
}

/**
 * Extract the most relevant ledger sections for a given chapter.
 * Acts as a lightweight "RAG" without a vector DB.
 */
function extractLedgerSlice(spec: ChapterSpec, ledger: ResearchLedger): string {
  const parts: string[] = [];

  const sections = spec.ledger_sections || ['all'];
  const includeAll = sections.includes('all');

  if (includeAll || sections.includes('market_data')) {
    if (ledger.market_data.length > 0) {
      parts.push(`=== DATI DI MERCATO VERIFICATI ===\n${JSON.stringify(ledger.market_data, null, 2).slice(0, 8000)}`);
    }
    if (ledger.modules.market_dynamics?.summary_markdown) {
      parts.push(`=== MARKET DYNAMICS MEMO ===\n${ledger.modules.market_dynamics.summary_markdown.slice(0, 6000)}`);
    }
  }

  if (includeAll || sections.includes('competitor_matrix')) {
    if (ledger.competitor_matrix.length > 0) {
      parts.push(`=== COMPETITOR MATRIX ===\n${JSON.stringify(ledger.competitor_matrix, null, 2).slice(0, 8000)}`);
    }
    if (ledger.modules.competitor_intelligence?.summary_markdown) {
      parts.push(`=== COMPETITOR WAR-ROOM MEMO ===\n${ledger.modules.competitor_intelligence.summary_markdown.slice(0, 5000)}`);
    }
  }

  if (includeAll || sections.includes('product_tech')) {
    if (ledger.modules.product_tech?.summary_markdown) {
      parts.push(`=== PRODUCT & TECH MEMO ===\n${ledger.modules.product_tech.summary_markdown.slice(0, 5000)}`);
    }
  }

  if (includeAll || sections.includes('economics')) {
    if (ledger.modules.economics_pricing?.summary_markdown) {
      parts.push(`=== ECONOMICS & PRICING MEMO ===\n${ledger.modules.economics_pricing.summary_markdown.slice(0, 5000)}`);
    }
  }

  if (includeAll || sections.includes('swoc')) {
    if (ledger.modules.swoc_synthesis?.summary_markdown) {
      parts.push(`=== CHALLENGER QA MEMO ===\n${ledger.modules.swoc_synthesis.summary_markdown.slice(0, 4000)}`);
    }
  }

  if (includeAll || sections.includes('verified_facts')) {
    if (ledger.verified_facts.length > 0) {
      parts.push(`=== FATTI VERIFICATI ===\n${JSON.stringify(ledger.verified_facts.slice(0, 40), null, 2).slice(0, 5000)}`);
    }
  }

  if (ledger.contradictions_log.length > 0) {
    parts.push(`=== CONTRADDIZIONI LOG ===\n${JSON.stringify(ledger.contradictions_log, null, 2).slice(0, 2000)}`);
  }

  return parts.join('\n\n');
}
