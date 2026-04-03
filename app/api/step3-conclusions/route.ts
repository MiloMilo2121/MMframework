import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai/openrouter';
import { STEP3_SYSTEM, buildStep3UserPrompt } from '@/lib/ai/prompts/step3';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      clientName: string;
      sector: string;
      reportPart1: string;
      reportPart2: string;
      handoffOperativo?: string;
    };

    const { clientName, sector, reportPart1, reportPart2, handoffOperativo } = body;

    if (!clientName) {
      return NextResponse.json(
        { error: 'clientName is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // Build a concise summary from both parts (max 8k chars total)
    const reportSummary = [
      reportPart1?.slice(0, 4000) || '',
      reportPart2?.slice(0, 4000) || '',
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const userPrompt = buildStep3UserPrompt({
      clientName,
      sector,
      reportSummary,
      handoffOperativo: handoffOperativo?.slice(0, 2000),
    });

    // Tier 3 — Ghostwriter: conclusions are final prose, same model as CoherenceGate
    const conclusions = await callOpenRouter({
      model: process.env.STEP3_MODEL || process.env.GHOSTWRITER_MODEL || 'anthropic/claude-sonnet-4-5',
      systemPrompt: STEP3_SYSTEM,
      maxTokens: 8192,
      temperature: 0.4,
      top_p: 0.9,
      frequency_penalty: 0.3,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return NextResponse.json({ conclusions });
  } catch (err) {
    console.error('[step3] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', code: 'STEP3_ERROR' },
      { status: 500 }
    );
  }
}
