import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY missing — required for RAG embedding lookup');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export async function embedQuery(text: string): Promise<number[]> {
  const trimmed = text.slice(0, 8000);
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIM) {
    throw new Error(`Unexpected embedding dim: got ${embedding?.length}, want ${EMBEDDING_DIM}`);
  }
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const trimmed = texts.map((t) => t.slice(0, 8000));
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  return response.data.map((d) => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { EMBEDDING_MODEL, EMBEDDING_DIM };
