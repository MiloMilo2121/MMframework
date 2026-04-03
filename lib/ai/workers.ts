/**
 * Worker engine — non-streaming tool use loop for the 5 Miner modules.
 *
 * Workers are pure async functions. They use the same tool use pattern
 * as part1/route.ts but batch (stream: false) for simplicity.
 * Each Worker returns a ModuleOutput that gets merged into the ResearchLedger.
 */
import { openrouter } from './openrouter';
import { RESEARCH_TOOLS, type ToolName } from './tools';
import { executeTool } from './tool-executor';
import { extractJson } from '@/lib/parsers/extract-json';
import type { ModuleId, ModuleOutput } from '@/lib/types/research-ledger';
import type OpenAI from 'openai';

const MAX_WORKER_TOOL_CALLS = 10;
const MAX_WORKER_ITERATIONS = 15;
const WORKER_TIMEOUT_MS = 90_000; // 90 second hard limit per Worker

export interface WorkerInput {
  moduleId: ModuleId;
  systemPrompt: string;
  userPrompt: string;
  model: string;
}

/**
 * Run a single Worker module. Non-streaming.
 * Returns a ModuleOutput even on partial failure (graceful degradation).
 */
export async function runWorker(input: WorkerInput): Promise<ModuleOutput> {
  const { moduleId, systemPrompt, userPrompt, model } = input;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userPrompt },
  ];

  let fullText = '';
  let toolCallCount = 0;
  let iterationCount = 0;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Worker ${moduleId} timeout after ${WORKER_TIMEOUT_MS / 1000}s`)), WORKER_TIMEOUT_MS)
  );

  try {
    await Promise.race([
      (async () => {
        while (iterationCount < MAX_WORKER_ITERATIONS && toolCallCount < MAX_WORKER_TOOL_CALLS) {
          iterationCount++;

          const response = await openrouter.chat.completions.create({
            model,
            max_tokens: 8000,
            temperature: 0.1,
            top_p: 0.1,
            presence_penalty: -0.5,
            stream: false,
            tools: RESEARCH_TOOLS,
            tool_choice: 'auto',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
          } as Parameters<typeof openrouter.chat.completions.create>[0]) as OpenAI.ChatCompletion;

          const choice = response.choices?.[0];
          if (!choice) break;

          const assistantMessage = choice.message;
          const textContent = typeof assistantMessage.content === 'string' ? assistantMessage.content : '';
          if (textContent) fullText += textContent + '\n';

          const toolCalls = assistantMessage.tool_calls || [];

          if (choice.finish_reason === 'tool_calls' || toolCalls.length > 0) {
            // Append assistant message
            messages.push({
              role: 'assistant',
              content: textContent || null,
              tool_calls: toolCalls,
            } as OpenAI.ChatCompletionMessageParam);

            // Execute tools
            for (const tc of toolCalls) {
              if (toolCallCount >= MAX_WORKER_TOOL_CALLS) break;
              toolCallCount++;

              const tcFunc = (tc as unknown as { function: { name: string; arguments: string } }).function;
              let toolArgs: Record<string, unknown> = {};
              try {
                toolArgs = JSON.parse(tcFunc.arguments || '{}');
              } catch {
                toolArgs = {};
              }

              const result = await executeTool(tcFunc.name as ToolName, toolArgs);

              messages.push({
                role: 'tool',
                tool_call_id: String(tc.id || ''),
                content: result,
              } as OpenAI.ChatCompletionMessageParam);
            }
            continue;
          }

          // finish_reason === 'stop' — done
          break;
        }
      })(),
      timeoutPromise,
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Worker ${moduleId}] Error:`, msg);

    return {
      module_id: moduleId,
      status: 'error',
      tool_calls_used: toolCallCount,
      summary_markdown: fullText || `[Worker ${moduleId} non completato: ${msg}]`,
      verified_facts: [],
      market_data: [],
      competitor_entries: [],
      error_message: msg,
    };
  }

  // Extract structured JSON from the output (if present)
  let structuredData: string | undefined;
  try {
    const jsonText = extractJson(fullText);
    if (jsonText && jsonText !== '{}') {
      structuredData = jsonText;
    }
  } catch {
    // No JSON found — that's OK
  }

  // Parse facts/data/competitors from structured output
  const parsed = tryParseModuleJson(structuredData);

  return {
    module_id: moduleId,
    status: fullText.length > 100 ? 'complete' : 'partial',
    tool_calls_used: toolCallCount,
    summary_markdown: fullText,
    verified_facts: parsed.verified_facts,
    market_data: parsed.market_data,
    competitor_entries: parsed.competitor_entries,
    structured_data: structuredData,
  };
}

function tryParseModuleJson(jsonStr?: string): Pick<ModuleOutput, 'verified_facts' | 'market_data' | 'competitor_entries'> {
  const empty = { verified_facts: [], market_data: [], competitor_entries: [] };
  if (!jsonStr) return empty;
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      verified_facts: Array.isArray(parsed.verified_facts) ? parsed.verified_facts : [],
      market_data: Array.isArray(parsed.market_data) ? parsed.market_data : [],
      competitor_entries: Array.isArray(parsed.competitor_entries) ? parsed.competitor_entries : [],
    };
  } catch {
    return empty;
  }
}
