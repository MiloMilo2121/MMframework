import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  TRANSCRIPT_PROCESSOR_SYSTEM,
  buildTranscriptProcessorUserPrompt,
} from '@/lib/ai/prompts/transcript-processor';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript = String(body.transcript || '').trim();

    if (!transcript || transcript.length < 50) {
      return NextResponse.json(
        { error: 'Trascrizione troppo breve o mancante.' },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const model =
      process.env.STEP1_MODEL?.replace('anthropic/', '') || 'claude-opus-4-6';

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      system: TRANSCRIPT_PROCESSOR_SYSTEM,
      messages: [
        {
          role: 'user',
          content: buildTranscriptProcessorUserPrompt(transcript),
        },
      ],
    });

    const rawText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    let transcriptIntel: unknown = null;
    try {
      // Try to parse the whole response as JSON first
      transcriptIntel = JSON.parse(rawText);
    } catch {
      // Extract JSON block if wrapped in markdown
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
        rawText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          transcriptIntel = JSON.parse(jsonMatch[1]);
        } catch {
          transcriptIntel = { raw: rawText };
        }
      } else {
        transcriptIntel = { raw: rawText };
      }
    }

    return NextResponse.json({ transcriptIntel });
  } catch (err) {
    console.error('[transcript-process] Error:', err);
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
