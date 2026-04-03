/**
 * Orchestrator — the Pentathlon Smart-Router for Step 2 Deep Research.
 *
 * Phase A: Build ResearchLedger from client context
 * Phase B: Promise.allSettled — 4 Miner Workers in parallel + 1 Challenger
 * Phase C: CoherenceGate — claude-opus-4-6 writes the final report (streaming)
 */
import { NextRequest } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { MAX_TOOL_CALLS, type ToolName } from '@/lib/ai/tools';
import { executeTool } from '@/lib/ai/tool-executor';
import { runWorker } from '@/lib/ai/workers';
import {
  createEmptyLedger,
  mergeLedger,
  type ContradictionEntry,
} from '@/lib/types/research-ledger';
import {
  WORKER_MARKET_DYNAMICS_SYSTEM,
  WORKER_COMPETITOR_SYSTEM,
  WORKER_PRODUCT_TECH_SYSTEM,
  WORKER_ECONOMICS_SYSTEM,
  WORKER_CHALLENGER_SYSTEM,
  buildWorkerUserPrompt,
  buildChallengerUserPrompt,
} from '@/lib/ai/prompts/step2-workers';
import {
  COHERENCE_GATE_SYSTEM,
  buildCoherenceGateUserPrompt,
} from '@/lib/ai/prompts/step2-coherence';
import { parseHandoffOperativo } from '@/lib/parsers/parse-handoff';
import { extractContextBridge } from '@/lib/parsers/parse-report';
import { healResponse } from '@/lib/ai/response-healing';
import type OpenAI from 'openai';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    clientSnapshot: string;
    handoffData1: string;
    questionnaire?: string;
    materials?: string;
    analysisId?: string;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const keepalive = setInterval(() => {
        send('ping', { ts: Date.now() });
      }, 15000);

      try {
        const minerModel = process.env.MINER_MODEL || 'deepseek/deepseek-r1';
        const coherenceModel = process.env.COHERENCE_MODEL || process.env.STEP2_MODEL || 'anthropic/claude-opus-4-6';

        // ── Phase A: Build initial ledger ────────────────────────────────────
        send('status', { phase: 'init', message: '🏗️ Costruzione Research Ledger...', step: 'init' });

        let clientSnapshotParsed: Record<string, unknown> = {};
        let handoffData1Parsed: Record<string, unknown> = {};
        try { clientSnapshotParsed = JSON.parse(body.clientSnapshot || '{}'); } catch { /* ok */ }
        try { handoffData1Parsed = JSON.parse(body.handoffData1 || '{}'); } catch { /* ok */ }

        const clientName = String(
          (clientSnapshotParsed as { client_name?: string }).client_name ||
          (handoffData1Parsed as { client?: { name?: string } }).client?.name ||
          'Cliente'
        );
        const sector = String(
          (clientSnapshotParsed as { sector?: string }).sector ||
          (handoffData1Parsed as { client?: { sector?: string } }).client?.sector ||
          'Settore'
        );
        const geography = String(
          (clientSnapshotParsed as { locations?: string[] }).locations?.[0] || 'Italia'
        );

        // Build context slice for Workers
        const contextSlice = buildContextSlice(body.clientSnapshot, body.handoffData1, body.questionnaire);

        const ledger = createEmptyLedger({
          analysisId: body.analysisId || 'unknown',
          clientName,
          sector,
          initialContext: {
            client_summary: contextSlice.slice(0, 2000),
            business_model: String((handoffData1Parsed as { client?: { business_model?: string } }).client?.business_model || 'unknown'),
            geography,
            offers_summary: contextSlice.slice(0, 500),
            key_questions: [],
            known_competitors: [],
          },
        });

        // ── Phase B: Run 4 Miners in parallel ───────────────────────────────
        send('status', { phase: 'workers', message: `⚡ Avvio 4 Worker in parallelo con ${minerModel}...`, step: 'workers_start' });
        send('module_status', { workerId: 'market_dynamics', status: 'running', toolCalls: 0 });
        send('module_status', { workerId: 'competitor_intelligence', status: 'running', toolCalls: 0 });
        send('module_status', { workerId: 'product_tech', status: 'running', toolCalls: 0 });
        send('module_status', { workerId: 'economics_pricing', status: 'running', toolCalls: 0 });

        const workerResults = await Promise.allSettled([
          runWorker({
            moduleId: 'market_dynamics',
            systemPrompt: WORKER_MARKET_DYNAMICS_SYSTEM,
            userPrompt: buildWorkerUserPrompt('market_dynamics', contextSlice),
            model: minerModel,
          }),
          runWorker({
            moduleId: 'competitor_intelligence',
            systemPrompt: WORKER_COMPETITOR_SYSTEM,
            userPrompt: buildWorkerUserPrompt('competitor_intelligence', contextSlice),
            model: minerModel,
          }),
          runWorker({
            moduleId: 'product_tech',
            systemPrompt: WORKER_PRODUCT_TECH_SYSTEM,
            userPrompt: buildWorkerUserPrompt('product_tech', contextSlice),
            model: minerModel,
          }),
          runWorker({
            moduleId: 'economics_pricing',
            systemPrompt: WORKER_ECONOMICS_SYSTEM,
            userPrompt: buildWorkerUserPrompt('economics_pricing', contextSlice),
            model: minerModel,
          }),
        ]);

        // Merge Worker outputs into ledger
        for (const result of workerResults) {
          if (result.status === 'fulfilled') {
            const output = result.value;
            mergeLedger(ledger, output);
            send('module_status', {
              workerId: output.module_id,
              status: output.status,
              toolCalls: output.tool_calls_used,
              message: output.error_message,
            });
          } else {
            console.error('[orchestrator] Worker failed:', result.reason);
          }
        }

        const completedWorkers = workerResults.filter((r) => r.status === 'fulfilled').length;
        send('status', {
          phase: 'challenger',
          message: `✅ ${completedWorkers}/4 Worker completati. Avvio Challenger...`,
          step: 'challenger_start',
        });
        send('module_status', { workerId: 'swoc_synthesis', status: 'running', toolCalls: 0 });

        // ── Phase B.5: Challenger cross-validation ───────────────────────────
        const w1 = ledger.modules.market_dynamics?.structured_data || ledger.modules.market_dynamics?.summary_markdown.slice(0, 2000) || '{}';
        const w2 = ledger.modules.competitor_intelligence?.structured_data || ledger.modules.competitor_intelligence?.summary_markdown.slice(0, 2000) || '{}';
        const w3 = ledger.modules.product_tech?.structured_data || ledger.modules.product_tech?.summary_markdown.slice(0, 2000) || '{}';
        const w4 = ledger.modules.economics_pricing?.structured_data || ledger.modules.economics_pricing?.summary_markdown.slice(0, 2000) || '{}';

        const challengerOutput = await runWorker({
          moduleId: 'swoc_synthesis',
          systemPrompt: WORKER_CHALLENGER_SYSTEM,
          userPrompt: buildChallengerUserPrompt(contextSlice, w1, w2, w3, w4),
          model: minerModel,
        });

        mergeLedger(ledger, challengerOutput);

        // Extract contradictions from challenger output
        if (challengerOutput.structured_data) {
          try {
            const parsed = JSON.parse(challengerOutput.structured_data) as {
              contradictions_found?: ContradictionEntry[];
            };
            if (Array.isArray(parsed.contradictions_found)) {
              ledger.contradictions_log.push(...parsed.contradictions_found);
            }
          } catch { /* ok */ }
        }

        send('module_status', {
          workerId: 'swoc_synthesis',
          status: challengerOutput.status,
          toolCalls: challengerOutput.tool_calls_used,
          contradictions: ledger.contradictions_log.length,
        });

        send('status', {
          phase: 'coherence',
          message: `🧠 Avvio CoherenceGate con ${coherenceModel}... (${ledger.verified_facts.length} fatti, ${ledger.competitor_matrix.length} competitor)`,
          step: 'coherence_start',
        });

        // ── Phase C: CoherenceGate streaming ────────────────────────────────
        const ledgerJson = JSON.stringify(ledger, null, 2);
        const coherenceUserPrompt = buildCoherenceGateUserPrompt({
          clientName,
          sector,
          geography,
          handoffData1: body.handoffData1 || '',
          ledgerJson,
        });

        const coherenceMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'user', content: coherenceUserPrompt },
        ];

        let fullText = '';
        let toolCallCount = 0;
        let iterationCount = 0;
        const MAX_ITERATIONS = 30;
        let currentChapter = 'Avvio CoherenceGate...';

        // CoherenceGate uses streaming (same pattern as part1/route.ts)
        while (iterationCount < MAX_ITERATIONS && toolCallCount < MAX_TOOL_CALLS) {
          iterationCount++;

          const toolCallAccumulator: Array<{
            index: number;
            id: string;
            name: string;
            arguments: string;
          }> = [];

          let finishReason = '';
          let iterationText = '';

          const streamResponse = await (openrouter.chat.completions.create({
            model: coherenceModel,
            max_tokens: 64000,
            temperature: 0.4,
            frequency_penalty: 0.3,
            stream: true,
            // CoherenceGate doesn't use tools — it only writes
            messages: [
              {
                role: 'system',
                content: [
                  { type: 'text', text: COHERENCE_GATE_SYSTEM, cache_control: { type: 'ephemeral' } },
                ] as unknown as string,
              },
              ...coherenceMessages,
            ],
          } as Parameters<typeof openrouter.chat.completions.create>[0]) as Promise<
            AsyncIterable<{
              choices: Array<{
                delta: {
                  content?: string | null;
                  tool_calls?: Array<{
                    index: number;
                    id?: string;
                    type?: string;
                    function?: { name?: string; arguments?: string };
                  }>;
                };
                finish_reason?: string | null;
              }>;
            }>
          >);

          for await (const chunk of streamResponse) {
            const choice = chunk.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;

            if (typeof delta.content === 'string' && delta.content) {
              iterationText += delta.content;
              fullText += delta.content;
              send('chunk', { text: delta.content });

              const matches = fullText.match(/^## (CAP\s+\d+[^#\n]*|EXECUTIVE SUMMARY[^\n]*)/gm);
              if (matches && matches.length > 0) {
                const latest = matches[matches.length - 1].replace(/^## /, '');
                if (latest !== currentChapter) {
                  currentChapter = latest;
                  send('chapter', { chapter: currentChapter });
                  send('status', {
                    phase: 'coherence',
                    message: `✍️ Scrivendo: ${currentChapter.slice(0, 60)}`,
                    step: 'writing',
                  });
                }
              }
            }

            if (delta.tool_calls && delta.tool_calls.length > 0) {
              for (const tcDelta of delta.tool_calls) {
                const idx = tcDelta.index ?? 0;
                if (!toolCallAccumulator[idx]) {
                  toolCallAccumulator[idx] = { index: idx, id: '', name: '', arguments: '' };
                }
                if (tcDelta.id) toolCallAccumulator[idx].id = tcDelta.id;
                if (tcDelta.function?.name) toolCallAccumulator[idx].name += tcDelta.function.name;
                if (tcDelta.function?.arguments) toolCallAccumulator[idx].arguments += tcDelta.function.arguments;
              }
            }

            if (choice.finish_reason) finishReason = choice.finish_reason;
          }

          const pendingToolCalls = toolCallAccumulator.filter((tc) => tc && tc.name);

          if (
            (finishReason === 'tool_calls' || finishReason === 'tool_use' || pendingToolCalls.length > 0) &&
            toolCallCount < MAX_TOOL_CALLS
          ) {
            const assistantMsg: OpenAI.ChatCompletionMessageParam = {
              role: 'assistant',
              content: iterationText || null,
              tool_calls: pendingToolCalls.map((tc) => ({
                id: tc.id || `call_${tc.index}`,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            };
            coherenceMessages.push(assistantMsg);

            const toolResultMessages: OpenAI.ChatCompletionMessageParam[] = [];
            for (const tc of pendingToolCalls) {
              toolCallCount++;
              let toolArgs: Record<string, unknown> = {};
              try { toolArgs = JSON.parse(tc.arguments || '{}'); } catch { /* ok */ }

              const result = await executeTool(tc.name as ToolName, toolArgs);
              toolResultMessages.push({
                role: 'tool',
                tool_call_id: tc.id || `call_${tc.index}`,
                content: result,
              } as OpenAI.ChatCompletionMessageParam);
            }
            coherenceMessages.push(...toolResultMessages);
            continue;
          }

          break;
        }

        // Healing if needed
        if (!fullText.includes('HANDOFF_OPERATIVO') && !fullText.includes('handoff_operativo')) {
          send('warning', { message: '⚠️ HANDOFF_OPERATIVO non trovato — healing...', code: 'MISSING_HANDOFF' });
          fullText = await healResponse(fullText, 'handoff_operativo', coherenceModel);
        }

        const { data: handoffOperativo } = parseHandoffOperativo(fullText);
        const wordCount = fullText.split(/\s+/).length;
        const chaptersFound = (fullText.match(/^## CAP\s+\d+/gm) || []).length;
        const contextBridge = extractContextBridge(fullText);

        send('complete', {
          fullText,
          contextBridge,
          handoffOperativo,
          wordCount,
          chaptersFound,
          toolCallsUsed: toolCallCount,
          workersCompleted: completedWorkers,
          factsGathered: ledger.verified_facts.length,
          competitorsFound: ledger.competitor_matrix.length,
          contradictionsResolved: ledger.contradictions_log.length,
        });

      } catch (err) {
        console.error('[orchestrator] SSE error:', err);
        send('error', {
          message: err instanceof Error ? err.message : 'Errore sconosciuto',
          code: 'ORCHESTRATOR_ERROR',
        });
      } finally {
        clearInterval(keepalive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function buildContextSlice(clientSnapshot: string, handoffData1: string, questionnaire?: string): string {
  const parts = [
    `=== CLIENT SNAPSHOT ===\n${clientSnapshot.slice(0, 3000)}`,
    `=== BLUEPRINT STRATEGICO ===\n${handoffData1.slice(0, 3000)}`,
  ];
  if (questionnaire) parts.push(`=== QUESTIONARIO ===\n${questionnaire.slice(0, 1500)}`);
  return parts.join('\n\n');
}
