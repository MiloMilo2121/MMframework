import OpenAI from 'openai';

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'SalesMap Intelligence',
  },
});

export interface CallOpenRouterOptions {
  model: string;
  systemPrompt?: string;
  systemPromptCached?: boolean;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  maxTokens?: number;
  stream?: boolean;
  thinking?: { type: 'enabled'; budget_tokens: number };
  providerOrder?: string[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * Helper to call OpenRouter with optional prompt caching and extended thinking.
 * For streaming use openrouter.chat.completions.create directly.
 */
export async function callOpenRouter(opts: CallOpenRouterOptions): Promise<string> {
  const {
    model,
    systemPrompt,
    systemPromptCached = false,
    messages,
    maxTokens = 8192,
    thinking,
    providerOrder,
    temperature,
    top_p,
    frequency_penalty,
    presence_penalty,
  } = opts;

  const systemMessages: OpenAI.Chat.ChatCompletionMessageParam[] = systemPrompt
    ? [
        {
          role: 'system',
          // For cached prompts, pass as array with cache_control (OpenRouter extension)
          // TypeScript doesn't know about cache_control, so we cast via unknown
          content: systemPromptCached
            ? ([{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] as unknown as string)
            : systemPrompt,
        },
      ]
    : [];

  const extraBody: Record<string, unknown> = {};
  if (thinking) {
    extraBody.thinking = thinking;
  }
  if (providerOrder && providerOrder.length > 0) {
    extraBody.provider = { order: providerOrder, allow_fallbacks: false };
  }

  const response = await openrouter.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [...systemMessages, ...messages],
    ...(temperature !== undefined && { temperature }),
    ...(top_p !== undefined && { top_p }),
    ...(frequency_penalty !== undefined && { frequency_penalty }),
    ...(presence_penalty !== undefined && { presence_penalty }),
    ...extraBody,
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

  // Extended thinking produces multiple content blocks; extract text blocks only
  const choice = response.choices[0];
  if (!choice?.message) throw new Error('No response from model');

  const content = choice.message.content;
  if (typeof content === 'string') return content;

  // Handle array content blocks (extended thinking)
  if (Array.isArray(content)) {
    return (content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('');
  }

  return '';
}
