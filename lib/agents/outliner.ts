import { callOpenRouter } from '@/lib/ai/openrouter';
import { OUTLINER_SYSTEM, buildOutlinerPrompt } from '@/lib/ai/prompts/outliner';
import { buildFrameworksPromptBlock } from '@/lib/rag/lookup';
import { extractJson } from '@/lib/parsers/extract-json';
import { ChapterOutlineSchema, type ChapterOutline, type FrameworkEntry, type StrategyThesis, type CostCallback } from './types';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';

interface RunOutlinerParams {
  spec: ChapterSpec;
  thesis: StrategyThesis;
  ledgerSlice: string;
  frameworks: FrameworkEntry[];
  previousChapterTitles: string[];
  model?: string;
  onCost?: CostCallback;
}

/**
 * Runs the Outliner agent for one chapter. Called N times (1 per chapter).
 * Uses Sonnet to keep cost predictable across many calls.
 */
export async function runOutliner(params: RunOutlinerParams): Promise<{
  outline: ChapterOutline;
  rawText: string;
  parseError: string | null;
}> {
  const model = params.model ?? process.env.OUTLINER_MODEL ?? 'anthropic/claude-sonnet-4-6';

  const frameworksBlock = buildFrameworksPromptBlock(params.frameworks);
  const availableIds = params.frameworks.map((f) => f.id);

  const userPrompt = buildOutlinerPrompt({
    chapterNumber: params.spec.number,
    chapterTitle: params.spec.title,
    focusInstructions: params.spec.focus_instructions,
    targetWordCount: params.spec.target_word_count,
    centralThesis: params.thesis.central_thesis,
    narrativeAngle: params.thesis.narrative_angle,
    ledgerSlice: params.ledgerSlice,
    frameworksBlock,
    availableFrameworkIds: availableIds,
    previousChapterTitles: params.previousChapterTitles,
  });

  const rawText = await callOpenRouter({
    model,
    systemPrompt: OUTLINER_SYSTEM,
    systemPromptCached: true,
    maxTokens: 2048,
    temperature: 0.3,
    messages: [{ role: 'user', content: userPrompt }],
  });

  if (params.onCost) {
    const promptTokens = Math.ceil((OUTLINER_SYSTEM.length + userPrompt.length) / 4);
    const completionTokens = Math.ceil(rawText.length / 4);
    params.onCost(model, { prompt_tokens: promptTokens, completion_tokens: completionTokens }, `outliner/cap_${params.spec.number}`);
  }

  let parseError: string | null = null;
  let outline: ChapterOutline;
  try {
    const json = JSON.parse(extractJson(rawText));
    outline = ChapterOutlineSchema.parse(json);
    if (outline.chapter_number !== params.spec.number) {
      outline = { ...outline, chapter_number: params.spec.number };
    }
  } catch (err) {
    parseError = err instanceof Error ? err.message : 'parse error';
    outline = {
      chapter_number: params.spec.number,
      thesis_link: `Capitolo ${params.spec.number} contribuisce alla tesi centrale.`,
      innovation_hooks: [],
      sub_points: [
        {
          title: params.spec.title,
          target_words: params.spec.target_word_count,
          data_anchors: params.spec.required_data_points,
        },
      ],
    };
  }

  return { outline, rawText, parseError };
}
