import { NextRequest } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { STEP2_PART2_SYSTEM, buildStep2Part2UserPrompt } from '@/lib/ai/prompts/step2-part2';
import { healResponse } from '@/lib/ai/response-healing';
import { parseHandoffOperativo } from '@/lib/parsers/parse-handoff';

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
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const keepalive = setInterval(() => {
        try { send('ping', { ts: Date.now() }); } catch { /* closed */ }
      }, 15000);

      try {
        send('status', { message: 'Avvio Deep Research Parte 2...', step: 'init' });

        const userPrompt = buildStep2Part2UserPrompt({
          contextBridge: body.contextBridge || '',
          handoffData1: body.handoffData1 || '',
          part1Summary: body.part1Summary,
        });

        const extraBody: Record<string, unknown> = {
          thinking: { type: 'enabled', budget_tokens: 6000 },
          provider: { order: ['Anthropic'], allow_fallbacks: false },
        };

        const response = await (openrouter.chat.completions.create({
          model: process.env.STEP2_MODEL || 'anthropic/claude-opus-4-5',
          max_tokens: 64000,
          stream: true,
          messages: [
            {
              role: 'system',
              content: [{ type: 'text', text: STEP2_PART2_SYSTEM, cache_control: { type: 'ephemeral' } }] as unknown as string,
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
          if (delta && typeof delta.content === 'string' && delta.content) {
            fullText += delta.content;
            chunkCount++;

            send('chunk', { text: delta.content });

            if (chunkCount % 20 === 0) {
              const matches = fullText.match(/^## (CAP\s+\d+[^#\n]*|ROADMAP[^\n]*)/gm);
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

        // Check for HANDOFF_OPERATIVO marker
        if (!fullText.includes('HANDOFF_OPERATIVO')) {
          send('warning', { message: 'HANDOFF_OPERATIVO non trovato — tentativo di healing...', code: 'MISSING_HANDOFF' });

          fullText = await healResponse(
            fullText,
            'HANDOFF_OPERATIVO',
            process.env.STEP2_MODEL || 'anthropic/claude-opus-4-5'
          );
        }

        // Extract HANDOFF_OPERATIVO JSON
        const { data: handoffOperativo, error: parseError } = parseHandoffOperativo(fullText);

        const wordCount = fullText.split(/\s+/).length;
        const chaptersFound = (fullText.match(/^## CAP\s+\d+/gm) || []).length;

        send('complete', {
          fullText,
          handoffOperativo,
          parseError,
          wordCount,
          chaptersFound,
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
