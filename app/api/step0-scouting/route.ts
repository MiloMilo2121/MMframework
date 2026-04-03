import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai/openrouter';
import { STEP0_SYSTEM, buildStep0UserPrompt } from '@/lib/ai/prompts/step0';
import { scoutWebsite, formatExaResultsForPrompt } from '@/lib/ai/exa';
import { safeParseJson } from '@/lib/parsers/extract-json';
import type { ClientSnapshot } from '@/lib/types/analysis';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      clientName: string;
      websiteUrl: string;
      country?: string;
      note?: string;
    };

    const { clientName, websiteUrl, country, note } = body;

    if (!clientName || !websiteUrl) {
      return NextResponse.json(
        { error: 'clientName and websiteUrl are required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // Step 1: Collect web context via Exa
    let webContext = '';
    try {
      const exaResults = await scoutWebsite(websiteUrl, clientName);
      webContext = formatExaResultsForPrompt(exaResults);
    } catch (err) {
      console.warn('[step0] Exa scouting failed, proceeding without web context:', err);
      webContext = 'Web scouting non disponibile per questa sessione.';
    }

    // Step 2: Run AI scouting
    const userPrompt = buildStep0UserPrompt({
      clientName,
      websiteUrl,
      country,
      note,
      webContext,
    });

    const rawText = await callOpenRouter({
      model: process.env.STEP0_MODEL || 'xiaomi/mimo-v2-pro',
      systemPrompt: STEP0_SYSTEM,
      maxTokens: 4096,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract CLIENT_SNAPSHOT JSON
    const { data: snapshot, error } = safeParseJson<ClientSnapshot>(rawText);

    return NextResponse.json({
      snapshot: snapshot || { client_name: clientName, website: websiteUrl },
      rawText,
      parseError: error,
    });
  } catch (err) {
    console.error('[step0] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', code: 'STEP0_ERROR' },
      { status: 500 }
    );
  }
}
