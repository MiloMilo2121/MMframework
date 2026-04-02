/**
 * In-memory cache for Exa search results.
 * Prevents duplicate queries when multiple Workers search for the same data.
 * TTL: 10 minutes (within a single analysis run).
 */
import type { ExaResult } from './exa';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  results: ExaResult[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function makeKey(query: string, maxResults: number): string {
  return `${query.toLowerCase().trim()}::${maxResults}`;
}

export function getCached(query: string, maxResults: number): ExaResult[] | null {
  const key = makeKey(query, maxResults);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.results;
}

export function setCached(query: string, maxResults: number, results: ExaResult[]): void {
  const key = makeKey(query, maxResults);
  cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCache(): void {
  cache.clear();
}
