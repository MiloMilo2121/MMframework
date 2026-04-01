import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai/openrouter';
import { STEP1_SYSTEM, buildStep1UserPrompt } from '@/lib/ai/prompts/step1';
import { parseHandoffData1 } from '@/lib/parsers/parse-handoff';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      questionnaire: string;
      clientSnapshot?: string;
      materials?: string;
    };

    const { questionnaire, clientSnapshot, materials } = body;

    if (!questionnaire) {
      return NextResponse.json(
        { error: 'questionnaire is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const userPrompt = buildStep1UserPrompt({ questionnaire, clientSnapshot, materials });

    const rawText = await callOpenRouter({
      model: process.env.STEP1_MODEL || 'anthropic/claude-opus-4-6',
      systemPrompt: STEP1_SYSTEM,
      systemPromptCached: true,
      maxTokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 8000 },
      providerOrder: ['Anthropic'],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const { data: handoffData1, error } = parseHandoffData1(rawText);

    return NextResponse.json({
      handoffData1,
      rawText,
      parseError: error,
    });
  } catch (err) {
    console.error('[step1] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', code: 'STEP1_ERROR' },
      { status: 500 }
    );
  }
}
