/**
 * Precompute embeddings for the framework corpus.
 * Reads lib/rag/frameworks/universal.json + verticals/*.json,
 * embeds each prompt_block via OpenAI text-embedding-3-small,
 * and writes the merged result to lib/rag/frameworks/_index.json.
 *
 * Run once whenever framework prompt_blocks are added/edited:
 *   npx tsx scripts/precompute-embeddings.ts
 */
import path from 'path';
import fs from 'fs/promises';
import OpenAI from 'openai';
import type { FrameworkEntry } from '../lib/agents/types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

const VERTICAL_FILES = ['saas', 'manufacturing', 'retail', 'b2b_services', 'ecommerce', 'services'];

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY missing. Aborting.');
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

  const baseDir = path.join(process.cwd(), 'lib', 'rag', 'frameworks');

  const universalRaw = await fs.readFile(path.join(baseDir, 'universal.json'), 'utf-8');
  const universal = JSON.parse(universalRaw) as FrameworkEntry[];

  const verticals: FrameworkEntry[] = [];
  for (const sector of VERTICAL_FILES) {
    const filePath = path.join(baseDir, 'verticals', `${sector}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      verticals.push(...(JSON.parse(raw) as FrameworkEntry[]));
    } catch (err) {
      console.warn(`Skipping ${sector}: ${err instanceof Error ? err.message : 'read error'}`);
    }
  }

  const all = [...universal, ...verticals];
  console.log(`Embedding ${all.length} frameworks via ${EMBEDDING_MODEL}...`);

  const inputs = all.map((f) => `${f.name}\n${f.use_cases.join(', ')}\n${f.prompt_block}`);

  const BATCH = 16;
  const embedded: FrameworkEntry[] = [];
  for (let i = 0; i < all.length; i += BATCH) {
    const slice = all.slice(i, i + BATCH);
    const sliceInputs = inputs.slice(i, i + BATCH);
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: sliceInputs,
    });
    for (let j = 0; j < slice.length; j++) {
      const embedding = response.data[j]?.embedding;
      if (!embedding || embedding.length !== EMBEDDING_DIM) {
        throw new Error(`Bad embedding for ${slice[j].id}`);
      }
      embedded.push({ ...slice[j], embedding });
    }
    console.log(`  ${i + slice.length}/${all.length}`);
  }

  const output = {
    version: '0.1.0',
    embedding_model: EMBEDDING_MODEL,
    embedding_dim: EMBEDDING_DIM,
    generated_at: new Date().toISOString(),
    frameworks: embedded,
  };

  const outPath = path.join(baseDir, '_index.json');
  await fs.writeFile(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${outPath} with ${embedded.length} frameworks.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
