import path from 'path';
import fs from 'fs/promises';
import type { FrameworkEntry } from '@/lib/agents/types';
import { cosineSimilarity, embedQuery } from './embed';

interface FrameworkIndex {
  version: string;
  embedding_model: string;
  embedding_dim: number;
  generated_at: string | null;
  frameworks: FrameworkEntry[];
}

const VERTICAL_FILES = ['saas', 'manufacturing', 'retail', 'b2b_services', 'ecommerce', 'services'] as const;

let _cache: FrameworkEntry[] | null = null;
let _hasEmbeddings = false;

async function loadIndex(): Promise<{ frameworks: FrameworkEntry[]; hasEmbeddings: boolean }> {
  if (_cache) return { frameworks: _cache, hasEmbeddings: _hasEmbeddings };

  const baseDir = path.join(process.cwd(), 'lib', 'rag', 'frameworks');
  const indexPath = path.join(baseDir, '_index.json');

  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as FrameworkIndex;
    if (parsed.frameworks.length > 0 && parsed.frameworks[0]?.embedding) {
      _cache = parsed.frameworks;
      _hasEmbeddings = true;
      return { frameworks: _cache, hasEmbeddings: true };
    }
  } catch {
    // _index.json missing or invalid — fall through to source files
  }

  const universalRaw = await fs.readFile(path.join(baseDir, 'universal.json'), 'utf-8');
  const universal = JSON.parse(universalRaw) as FrameworkEntry[];

  const verticals: FrameworkEntry[] = [];
  for (const sector of VERTICAL_FILES) {
    try {
      const raw = await fs.readFile(path.join(baseDir, 'verticals', `${sector}.json`), 'utf-8');
      verticals.push(...(JSON.parse(raw) as FrameworkEntry[]));
    } catch {
      // sector file missing — skip
    }
  }

  _cache = [...universal, ...verticals];
  _hasEmbeddings = false;
  return { frameworks: _cache, hasEmbeddings: false };
}

interface SelectParams {
  brief: string;
  sector: string;
  chapterFocus?: string;
  topK?: number;
}

/**
 * Select frameworks for a given brief and sector.
 * Always returns universals + top-K verticals matching the sector.
 * If embeddings are available, ranks verticals by cosine similarity to brief.
 * Otherwise returns the first K verticals matching sector (deterministic fallback).
 */
export async function selectFrameworks(params: SelectParams): Promise<FrameworkEntry[]> {
  const { brief, sector, chapterFocus, topK = 4 } = params;
  const { frameworks, hasEmbeddings } = await loadIndex();

  const universals = frameworks.filter((f) => f.category === 'universal');
  const verticals = frameworks.filter(
    (f) => f.category === 'vertical' && (f.sectors.includes(sector) || f.sectors.includes('*'))
  );

  if (verticals.length === 0) return universals;

  if (!hasEmbeddings) {
    return [...universals, ...verticals.slice(0, topK)];
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(`${brief}\n${chapterFocus ?? ''}`);
  } catch {
    // Embed call failed (no key, network) — fall back to deterministic
    return [...universals, ...verticals.slice(0, topK)];
  }

  const ranked = verticals
    .map((f) => ({ f, score: f.embedding ? cosineSimilarity(queryEmbedding, f.embedding) : 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.f);

  return [...universals, ...ranked];
}

export function buildFrameworksPromptBlock(frameworks: FrameworkEntry[]): string {
  if (frameworks.length === 0) return '';
  const blocks = frameworks.map((f) => `### ${f.name} (${f.id})\n${f.prompt_block}`);
  return `# FRAMEWORK DI RIFERIMENTO\n\n${blocks.join('\n\n---\n\n')}`;
}

export function clearFrameworkCache(): void {
  _cache = null;
  _hasEmbeddings = false;
}
