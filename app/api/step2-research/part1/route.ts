import { NextRequest } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { STEP2_PART1_SYSTEM, buildStep2Part1UserPrompt } from '@/lib/ai/prompts/step2-part1';
import { healResponse } from '@/lib/ai/response-healing';
import { extractContextBridge } from '@/lib/parsers/parse-report';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    clientSnapshot: string;
    handoffData1: string;
    materials?: string;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Keepalive every 15 seconds
      const keepalive = setInterval(() => {
        try { send('ping', { ts: Date.now() }); } catch { /* closed */ }
      }, 15000);

      try {
        send('status', { message: 'Avvio Deep Research Parte 1...', step: 'init' });

        const userPrompt = buildStep2Part1UserPrompt({
          clientSnapshot: body.clientSnapshot || '',
          handoffData1: body.handoffData1 || '',
          materials: body.materials,
        });

        const extraBody: Record<string, unknown> = {
          thinking: { type: 'enabled', budget_tokens: 10000 },
          provider: { order: ['Anthropic'], allow_fallbacks: false },
        };

        const response = await (openrouter.chat.completions.create({
          model: process.env.STEP2_MODEL || 'anthropic/claude-opus-4-5',
          max_tokens: 64000,
          stream: true,
          messages: [
            {
              role: 'system',
              // cache_control is an OpenRouter extension — cast via unknown
              content: [{ type: 'text', text: STEP2_PART1_SYSTEM, cache_control: { type: 'ephemeral' } }] as unknown as string,
            },
            { role: 'user', content: userPrompt },
          ],
          ...extraBody,
        } as Parameters<typeof openrouter.chat.completions.create>[0]) as Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>>);

        let fullText = '';
        let currentChapter = 'Avvio...';
        let chunkCount = 0;

        for await (const chunk of response) {
          const choice = chunk.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta as { content?: string | null };
          // Skip thinking blocks — only process text content
          if (delta && typeof delta.content === 'string' && delta.content) {
            fullText += delta.content;
            chunkCount++;

            send('chunk', { text: delta.content });

            // Detect chapter transitions (every 20 chunks to avoid overhead)
            if (chunkCount % 20 === 0) {
              const matches = fullText.match(/^## (CAP\s+\d+[^#\n]*|EXECUTIVE SUMMARY[^\n]*)/gm);
              if (matches && matches.length > 0) {
                const latest = matches[matches.length - 1].replace(/^## /, '');
                if (latest !== currentChapter) {
                  currentChapter = latest;
                  send('chapter', { chapter: currentChapter });
                }
              }
            }
          }
        }

        // Check for END_PART_1 marker
        if (!fullText.includes('---END_PART_1---')) {
          send('warning', { message: 'Marker END_PART_1 non trovato — tentativo di healing...', code: 'MISSING_MARKER' });

          fullText = await healResponse(
            fullText,
            '---END_PART_1---',
            process.env.STEP2_MODEL || 'anthropic/claude-opus-4-5'
          );
        }

        const contextBridge = extractContextBridge(fullText);
        const wordCount = fullText.split(/\s+/).length;
        const chaptersFound = (fullText.match(/^## CAP\s+\d+/gm) || []).length;

        send('complete', {
          fullText,
          contextBridge,
          wordCount,
          chaptersFound,
          hasEndMarker: fullText.includes('---END_PART_1---'),
        });

      } catch (err) {
        console.error('[step2-part1] SSE error:', err);
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
