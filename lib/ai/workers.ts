/**
 * Worker engine — Map-Reduce architecture for the 5 Miner modules.
 *
 * Each Miner runs 3 phases:
 *   Phase A — LLM generates a JSON array of targeted search queries (no tools)
 *   Phase B — Node.js executes queries in parallel batches via Exa (no LLM)
 *   Phase C — LLM extracts structured ModuleOutput JSON from the raw text (no tools)
 *
 * The Challenger (swoc_synthesis) skips Phase A/B and only runs Phase C
 * because it analyses the outputs of the other workers, not raw web pages.
 */
import { openrouter } from './openrouter';
import { batchSearchExa, formatExaResultsForPrompt } from './exa';
import { extractJson, validateModuleOutputJson, buildZodCorrectionPrompt } from '@/lib/parsers/extract-json';
import type { ModuleId, ModuleOutput } from '@/lib/types/research-ledger';
import type OpenAI from 'openai';

// ── Tuning constants ──────────────────────────────────────────────────────────
const MAX_QUERIES_PER_WORKER = 30;   // Phase A cap (30 × 5 results = 150 pages max)
const EXA_BATCH_SIZE         = 8;    // Concurrent Exa requests per batch
const EXA_RESULTS_PER_QUERY  = 5;    // Results returned per query
const MAX_RAW_TEXT_CHARS     = 120_000; // ~30k tokens fed into Phase C
const WORKER_TIMEOUT_MS      = 120_000; // 120 s hard limit per Worker

// ── WorkerInput ───────────────────────────────────────────────────────────────
export interface WorkerInput {
  moduleId: ModuleId;
  /** Phase C: system prompt for data extraction */
  systemPrompt: string;
  /** Phase C: user prompt — raw search text will be appended */
  userPrompt: string;
  model: string;
  /** Phase A: system prompt for query generation (Map-Reduce path) */
  queryGenSystemPrompt?: string;
  /** Phase A: user prompt for query generation (Map-Reduce path) */
  queryGenUserPrompt?: string;
  /** Optional cost tracking callback — called after each LLM call */
  onCost?: (model: string, usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined, phase: string) => void;
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function runWorker(input: WorkerInput): Promise<ModuleOutput> {
  const useMapReduce = Boolean(input.queryGenSystemPrompt && input.queryGenUserPrompt);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Worker ${input.moduleId} timeout after ${WORKER_TIMEOUT_MS / 1000}s`)),
      WORKER_TIMEOUT_MS
    )
  );

  try {
    return await Promise.race([
      useMapReduce ? runMapReduce(input) : runToolCallLoop(input),
      timeoutPromise,
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Worker ${input.moduleId}] Fatal:`, msg);
    return emptyOutput(input.moduleId, msg);
  }
}

// ── Map-Reduce path ───────────────────────────────────────────────────────────
async function runMapReduce(input: WorkerInput): Promise<ModuleOutput> {
  const { moduleId, model, queryGenSystemPrompt, queryGenUserPrompt, systemPrompt, userPrompt, onCost } = input;

  // ── Phase A: generate query list ─────────────────────────────────────────
  const queryResponse = await openrouter.chat.completions.create({
    model,
    max_tokens: 2000,
    temperature: 0.1,
    top_p: 0.1,
    stream: false,
    messages: [
      { role: 'system', content: queryGenSystemPrompt! },
      { role: 'user', content: queryGenUserPrompt! },
    ],
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) as OpenAI.ChatCompletion;
  onCost?.(model, queryResponse.usage, `${moduleId}/phase_a`);

  let queries: string[] = [];
  const queryRaw = queryResponse.choices?.[0]?.message?.content || '';
  try {
    const jsonStr = extractJson(queryRaw);
    const parsed = JSON.parse(jsonStr) as unknown;
    if (Array.isArray(parsed)) {
      queries = parsed.filter((q): q is string => typeof q === 'string');
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).queries)) {
      queries = ((parsed as Record<string, unknown>).queries as unknown[]).filter(
        (q): q is string => typeof q === 'string'
      );
    }
  } catch {
    console.warn(`[Worker ${moduleId}] Phase A: no query JSON found — falling back to empty`);
  }

  if (queries.length === 0) {
    return emptyOutput(moduleId, 'Phase A produced zero queries');
  }

  const cappedQueries = queries.slice(0, MAX_QUERIES_PER_WORKER);
  console.log(`[Worker ${moduleId}] Phase A: ${cappedQueries.length} queries generated`);

  // ── Phase B: batch fetch via Exa ──────────────────────────────────────────
  const rawResults = await batchSearchExa(cappedQueries, EXA_BATCH_SIZE, EXA_RESULTS_PER_QUERY);
  const rawText = formatExaResultsForPrompt(rawResults).slice(0, MAX_RAW_TEXT_CHARS);
  console.log(`[Worker ${moduleId}] Phase B: ${rawResults.length} pages fetched (${rawText.length} chars)`);

  // ── Phase C: extract structured data ─────────────────────────────────────
  const extractionParams = {
    model,
    max_tokens: 8000,
    temperature: 0.1,
    top_p: 0.1,
    presence_penalty: -0.5,
    stream: false as const,
  };

  const extractMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `${userPrompt}\n\n${'═'.repeat(60)}\nRAW SEARCH RESULTS (${rawResults.length} pagine da Exa)\n${'═'.repeat(60)}\n${rawText}`,
    },
  ];

  const extractResponse = await openrouter.chat.completions.create({
    ...extractionParams,
    messages: extractMessages,
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) as OpenAI.ChatCompletion;
  onCost?.(model, extractResponse.usage, `${moduleId}/phase_c`);

  let fullText = extractResponse.choices?.[0]?.message?.content || '';
  console.log(`[Worker ${moduleId}] Phase C: ${fullText.length} chars extracted`);

  // ── Zod validation + single auto-correction attempt ───────────────────────
  let validation = validateModuleOutputJson(fullText);

  if (validation.zodErrors && validation.rawJson) {
    console.warn(`[Worker ${moduleId}] Zod validation failed (${validation.zodErrors.issues.length} issues) — auto-correcting...`);
    const correctionPrompt = buildZodCorrectionPrompt(validation.zodErrors, validation.rawJson);

    const correctionMessages: OpenAI.ChatCompletionMessageParam[] = [
      ...extractMessages,
      { role: 'assistant', content: fullText },
      { role: 'user', content: correctionPrompt },
    ];

    const correctionResponse = await openrouter.chat.completions.create({
      ...extractionParams,
      messages: correctionMessages,
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) as OpenAI.ChatCompletion;
    onCost?.(model, correctionResponse.usage, `${moduleId}/phase_c_correction`);

    const correctedText = correctionResponse.choices?.[0]?.message?.content || '';
    if (correctedText) {
      fullText = correctedText;
      validation = validateModuleOutputJson(fullText);
      console.log(`[Worker ${moduleId}] Auto-correction result: ${validation.zodErrors ? 'still invalid (using soft data)' : 'valid ✓'}`);
    }
  }

  return {
    module_id: moduleId,
    status: validation.data ? 'complete' : 'partial',
    tool_calls_used: cappedQueries.length,
    summary_markdown: fullText,
    // Cast: Zod passthrough infers wider types than our interfaces, shape is identical
    verified_facts:    (validation.data?.verified_facts    ?? []) as ModuleOutput['verified_facts'],
    market_data:       (validation.data?.market_data       ?? []) as ModuleOutput['market_data'],
    competitor_entries:(validation.data?.competitor_entries ?? []) as ModuleOutput['competitor_entries'],
    structured_data: validation.rawJson ?? undefined,
  };
}

// ── Legacy tool-call loop (used for Challenger) ───────────────────────────────
async function runToolCallLoop(input: WorkerInput): Promise<ModuleOutput> {
  const { moduleId, model, systemPrompt, userPrompt, onCost } = input;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userPrompt },
  ];

  let fullText = '';
  let iterationCount = 0;
  const MAX_ITERATIONS = 5; // Challenger doesn't need tools, so low limit

  while (iterationCount < MAX_ITERATIONS) {
    iterationCount++;

    const response = await openrouter.chat.completions.create({
      model,
      max_tokens: 8000,
      temperature: 0.1,
      top_p: 0.1,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) as OpenAI.ChatCompletion;

    onCost?.(model, response.usage, `${moduleId}/challenger`);

    const choice = response.choices?.[0];
    if (!choice) break;

    const text = typeof choice.message.content === 'string' ? choice.message.content : '';
    if (text) fullText += text + '\n';

    if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) break;
  }

  return buildOutput(moduleId, fullText, 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildOutput(moduleId: ModuleId, fullText: string, queriesRun: number): ModuleOutput {
  let structuredData: string | undefined;
  try {
    const j = extractJson(fullText);
    if (j && j !== '{}') structuredData = j;
  } catch { /* no JSON — ok */ }

  const parsed = tryParseModuleJson(structuredData);

  return {
    module_id: moduleId,
    status: fullText.length > 200 ? 'complete' : 'partial',
    tool_calls_used: queriesRun, // repurposed: counts Exa queries in Map-Reduce
    summary_markdown: fullText,
    verified_facts: parsed.verified_facts,
    market_data: parsed.market_data,
    competitor_entries: parsed.competitor_entries,
    structured_data: structuredData,
  };
}

function emptyOutput(moduleId: ModuleId, errorMessage: string): ModuleOutput {
  return {
    module_id: moduleId,
    status: 'error',
    tool_calls_used: 0,
    summary_markdown: `[Worker ${moduleId} non completato: ${errorMessage}]`,
    verified_facts: [],
    market_data: [],
    competitor_entries: [],
    error_message: errorMessage,
  };
}

function tryParseModuleJson(
  jsonStr?: string
): Pick<ModuleOutput, 'verified_facts' | 'market_data' | 'competitor_entries'> {
  const empty = { verified_facts: [], market_data: [], competitor_entries: [] };
  if (!jsonStr) return empty;
  try {
    const p = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      verified_facts: Array.isArray(p.verified_facts) ? p.verified_facts : [],
      market_data: Array.isArray(p.market_data) ? p.market_data : [],
      competitor_entries: Array.isArray(p.competitor_entries) ? p.competitor_entries : [],
    };
  } catch {
    return empty;
  }
}
