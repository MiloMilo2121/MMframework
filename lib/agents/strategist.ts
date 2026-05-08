import { callOpenRouter } from '@/lib/ai/openrouter';
import { STRATEGIST_SYSTEM, buildStrategistPrompt } from '@/lib/ai/prompts/strategist';
import { buildFrameworksPromptBlock } from '@/lib/rag/lookup';
import { extractJson } from '@/lib/parsers/extract-json';
import { StrategyThesisSchema, type StrategyThesis, type FrameworkEntry, type CostCallback } from './types';

interface RunStrategistParams {
  clientName: string;
  sector: string;
  geography: string;
  ledgerSummary: string;
  handoffData1Excerpt: string;
  questionnaireExcerpt?: string;
  frameworks: FrameworkEntry[];
  model?: string;
  onCost?: CostCallback;
}

/**
 * Runs the Strategist agent. One call per analysis. Uses Opus for reasoning depth.
 * On parse failure, returns a degraded thesis built from the inputs so the pipeline
 * does not stall — but the caller should log the parse error.
 */
export async function runStrategist(params: RunStrategistParams): Promise<{
  thesis: StrategyThesis;
  rawText: string;
  parseError: string | null;
}> {
  const model = params.model ?? process.env.STRATEGIST_MODEL ?? 'anthropic/claude-opus-4-7';

  const frameworksBlock = buildFrameworksPromptBlock(params.frameworks);
  const availableIds = params.frameworks.map((f) => f.id);

  const userPrompt = buildStrategistPrompt({
    clientName: params.clientName,
    sector: params.sector,
    geography: params.geography,
    ledgerSummary: params.ledgerSummary,
    handoffData1Excerpt: params.handoffData1Excerpt,
    questionnaireExcerpt: params.questionnaireExcerpt,
    frameworksBlock,
    availableFrameworkIds: availableIds,
  });

  const rawText = await callOpenRouter({
    model,
    systemPrompt: STRATEGIST_SYSTEM,
    systemPromptCached: true,
    maxTokens: 4096,
    temperature: 0.4,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Approximate token usage for cost tracking (callOpenRouter does not return usage).
  if (params.onCost) {
    const promptTokens = Math.ceil((STRATEGIST_SYSTEM.length + userPrompt.length) / 4);
    const completionTokens = Math.ceil(rawText.length / 4);
    params.onCost(model, { prompt_tokens: promptTokens, completion_tokens: completionTokens }, 'strategist');
  }

  let parseError: string | null = null;
  let thesis: StrategyThesis;
  try {
    const json = JSON.parse(extractJson(rawText));
    thesis = StrategyThesisSchema.parse(json);
  } catch (err) {
    parseError = err instanceof Error ? err.message : 'parse error';
    thesis = {
      central_thesis: `Analisi strategica per ${params.clientName} nel settore ${params.sector}.`,
      narrative_angle: 'Identificare opportunità e rischi prioritari nei prossimi 12 mesi.',
      positioning_statement: `${params.clientName}: leva strategica da attivare nel ${params.sector}.`,
      selected_frameworks: availableIds.slice(0, 3),
      contrarian_insights: [],
      must_address: [],
      must_avoid: [
        'approccio strutturato',
        'in un mondo sempre più',
        'le imprese di oggi',
        'occorre essere agili',
      ],
    };
  }

  return { thesis, rawText, parseError };
}
