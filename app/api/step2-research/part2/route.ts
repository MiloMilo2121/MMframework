import { NextRequest } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { STEP2_PART2_SYSTEM, buildStep2Part2UserPrompt } from '@/lib/ai/prompts/step2-part2';
import { RESEARCH_TOOLS, MAX_TOOL_CALLS, type ToolName } from '@/lib/ai/tools';
import { executeTool } from '@/lib/ai/tool-executor';
import { parseHandoffOperativo } from '@/lib/parsers/parse-handoff';
import type OpenAI from 'openai';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    contextBridge: string;
    handoffData1: string;
    part1Summary?: string;
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
          // Stream may be closed
        }
      };

      const keepalive = setInterval(() => {
        send('ping', { ts: Date.now() });
      }, 15000);

      try {
        send('status', { message: '🚀 Avvio Deep Research Parte 2 con Web Intelligence...', step: 'init' });

        const userPrompt = buildStep2Part2UserPrompt({
          contextBridge: body.contextBridge || '',
          handoffData1: body.handoffData1 || '',
          part1Summary: body.part1Summary,
        });

        const model = process.env.STEP2_MODEL || 'anthropic/claude-opus-4-5';

        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'user', content: userPrompt },
        ];

        let fullText = '';
        let toolCallCount = 0;
        let iterationCount = 0;
        const MAX_ITERATIONS = 30;
        let currentChapter = 'Avvio Parte 2...';

        send('status', { message: `🧠 Connessione a ${model} per Parte 2...`, step: 'connecting' });

        // ── Tool use loop ────────────────────────────────────────────────────
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

          try {
            const streamResponse = await (openrouter.chat.completions.create({
              model,
              max_tokens: 64000,
              stream: true,
              tools: RESEARCH_TOOLS,
              tool_choice: 'auto',
              messages: [
                {
                  role: 'system',
                  content: [
                    { type: 'text', text: STEP2_PART2_SYSTEM, cache_control: { type: 'ephemeral' } },
                  ] as unknown as string,
                },
                ...messages,
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

              // Stream text to client
              if (typeof delta.content === 'string' && delta.content) {
                iterationText += delta.content;
                fullText += delta.content;
                send('chunk', { text: delta.content });

                // Chapter detection
                const matches = fullText.match(/^## (CAP\s+\d+[^#\n]*|ROADMAP[^\n]*|CHECK QUALIT[^\n]*)/gm);
                if (matches && matches.length > 0) {
                  const latest = matches[matches.length - 1].replace(/^## /, '');
                  if (latest !== currentChapter) {
                    currentChapter = latest;
                    send('chapter', { chapter: currentChapter });
                  }
                }
              }

              // Accumulate tool call deltas
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

              if (choice.finish_reason) {
                finishReason = choice.finish_reason;
              }
            }
          } catch (streamErr) {
            console.error('[step2-part2] Stream error:', streamErr);
            throw streamErr;
          }

          const pendingToolCalls = toolCallAccumulator.filter((tc) => tc && tc.name);

          // ── Handle tool calls ──────────────────────────────────────────────
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
            messages.push(assistantMsg);

            const toolResultMessages: OpenAI.ChatCompletionMessageParam[] = [];
            for (const tc of pendingToolCalls) {
              toolCallCount++;
              let toolArgs: Record<string, unknown> = {};
              try {
                toolArgs = JSON.parse(tc.arguments || '{}');
              } catch {
                toolArgs = { query: tc.arguments };
              }

              const toolName = tc.name as ToolName;
              const searchQuery = String(
                toolArgs.query || toolArgs.competitor_name || toolArgs.url || toolArgs.subject || tc.name
              );

              send('status', {
                message: `🔍 Ricerca [${toolCallCount}/${MAX_TOOL_CALLS}]: ${searchQuery.slice(0, 80)}...`,
                step: 'tool_call',
                toolName,
              });

              const result = await executeTool(toolName, toolArgs);

              send('status', {
                message: `✅ Dati recuperati: ${searchQuery.slice(0, 60)}`,
                step: 'tool_result',
              });

              toolResultMessages.push({
                role: 'tool',
                tool_call_id: tc.id || `call_${tc.index}`,
                content: result,
              } as OpenAI.ChatCompletionMessageParam);
            }

            messages.push(...toolResultMessages);
            continue;
          }

          // Done
          break;
        }

        // Extract HANDOFF_OPERATIVO
        send('status', { message: '📦 Estrazione HANDOFF_OPERATIVO...', step: 'parsing' });

        const { data: handoffOperativo, error: parseError } = parseHandoffOperativo(fullText);

        if (parseError) {
          send('warning', {
            message: `⚠️ Parsing HANDOFF_OPERATIVO: ${parseError}`,
            code: 'PARSE_WARNING',
          });
        }

        const wordCount = fullText.split(/\s+/).length;
        const chaptersFound = (fullText.match(/^## CAP\s+\d+/gm) || []).length;

        send('complete', {
          fullText,
          handoffOperativo,
          wordCount,
          chaptersFound,
          toolCallsUsed: toolCallCount,
          hasHandoff: !!handoffOperativo,
        });

      } catch (err) {
        console.error('[step2-part2] SSE error:', err);
        send('error', {
          message: err instanceof Error ? err.message : 'Errore sconosciuto',
          code: 'STREAM_ERROR',
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
