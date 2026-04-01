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
      // Walk back to find matching opening brace
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
