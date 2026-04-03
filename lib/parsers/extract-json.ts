import { z } from 'zod';

/**
 * Extracts the last valid JSON block from a markdown/AI response text.
 * First tries ```json fences, then falls back to balanced brace search.
 */
export function extractJson(text: string): string {
  // Try to find last ```json ... ``` block
  const fenceRegex = /```json\s*([\s\S]+?)\s*```/g;
  let lastMatch: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    lastMatch = match[1];
  }

  if (lastMatch) {
    return lastMatch.trim();
  }

  // Fallback: find last balanced { ... } in the text
  let lastBraceStart = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}') {
      let depth = 0;
      for (let j = i; j >= 0; j--) {
        if (text[j] === '}') depth++;
        else if (text[j] === '{') {
          depth--;
          if (depth === 0) {
            lastBraceStart = j;
            break;
          }
        }
      }
      if (lastBraceStart >= 0) break;
    }
  }

  if (lastBraceStart >= 0) {
    const end = text.lastIndexOf('}');
    return text.slice(lastBraceStart, end + 1).trim();
  }

  throw new Error('No JSON found in text');
}

/**
 * Safely parse JSON with error context.
 */
export function safeParseJson<T = unknown>(text: string): { data: T; error: null } | { data: null; error: string } {
  try {
    const jsonText = extractJson(text);
    const data = JSON.parse(jsonText) as T;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'JSON parse failed' };
  }
}

// ── Zod schemas for ModuleOutput validation ───────────────────────────────────

const VerifiedFactSchema = z.object({
  claim:          z.string(),
  value:          z.string().optional(),
  source_name:    z.string(),
  source_url:     z.string().optional(),
  published_date: z.string().optional(),
  status:         z.enum(['verified', 'estimated', 'unverified', 'contradicted']).default('estimated'),
  contributed_by: z.string(),
}).passthrough();

const MarketDataSchema = z.object({
  metric:        z.string(),
  value:         z.string(),
  unit:          z.string(),
  year:          z.number().optional(),
  geography:     z.string().optional(),
  source:        z.string(),
  confidence:    z.enum(['high', 'medium', 'low']).default('medium'),
  contributed_by: z.string(),
}).passthrough();

const CompetitorEntrySchema = z.object({
  name:                 z.string(),
  url:                  z.string().optional(),
  pricing_model:        z.string().optional(),
  price_range:          z.string().optional(),
  key_messages:         z.array(z.string()).default([]),
  strengths:            z.array(z.string()).default([]),
  weaknesses:           z.array(z.string()).default([]),
  review_score:         z.number().optional(),
  advertising_channels: z.array(z.string()).default([]),
  contributed_by:       z.string(),
}).passthrough();

const ModuleOutputJsonSchema = z.object({
  verified_facts:    z.array(VerifiedFactSchema).default([]),
  market_data:       z.array(MarketDataSchema).default([]),
  competitor_entries: z.array(CompetitorEntrySchema).default([]),
}).passthrough();

export type ModuleOutputJson = z.infer<typeof ModuleOutputJsonSchema>;

/**
 * Parse + validate a ModuleOutput JSON string against the Zod schema.
 *
 * Returns:
 * - `{ data, zodErrors: null }` on full success
 * - `{ data, zodErrors }` on soft-fail (partial data still returned)
 * - `{ data: null, zodErrors }` on hard-fail (unparseable JSON)
 */
export function validateModuleOutputJson(text: string): {
  data: ModuleOutputJson | null;
  zodErrors: z.ZodError | null;
  rawJson: string | null;
} {
  let rawJson: string | null = null;

  try {
    rawJson = extractJson(text);
  } catch {
    return {
      data: null,
      zodErrors: new z.ZodError([{
        code: 'custom',
        path: [],
        message: 'No JSON block found in LLM output',
      }]),
      rawJson: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return {
      data: null,
      zodErrors: new z.ZodError([{
        code: 'custom',
        path: [],
        message: `JSON.parse failed: ${err instanceof Error ? err.message : 'unknown'}`,
      }]),
      rawJson,
    };
  }

  const result = ModuleOutputJsonSchema.safeParse(parsed);

  if (result.success) {
    return { data: result.data, zodErrors: null, rawJson };
  }

  // Soft fail: coerce partial data using defaults
  const softData = ModuleOutputJsonSchema.parse({
    verified_facts:     [],
    market_data:        [],
    competitor_entries: [],
    ...(typeof parsed === 'object' && parsed !== null ? parsed : {}),
  });

  return { data: softData, zodErrors: result.error, rawJson };
}

/**
 * Build a self-correction prompt suffix when Zod validation fails.
 * Pass this back to the LLM as a follow-up user message.
 */
export function buildZodCorrectionPrompt(zodErrors: z.ZodError, rawJson: string): string {
  const issues = zodErrors.issues
    .slice(0, 10) // cap to avoid token waste
    .map((i) => `• ${i.path.join('.') || 'root'}: ${i.message}`)
    .join('\n');

  return `Il JSON che hai prodotto non rispetta lo schema richiesto. Errori Zod:\n${issues}\n\nJSON originale (primi 2000 char):\n${rawJson.slice(0, 2000)}\n\nCorreggi il JSON e restituiscilo in un blocco \`\`\`json ... \`\`\`. Solo il JSON corretto, nient'altro.`;
}
