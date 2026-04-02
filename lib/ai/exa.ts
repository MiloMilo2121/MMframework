import Exa from 'exa-js';
import { getCached, setCached } from './exa-cache';

let _exa: Exa | null = null;

function getRecentDate(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString();
}

function getExa(): Exa {
  if (!_exa) {
    _exa = new Exa(process.env.EXA_API_KEY!);
  }
  return _exa;
}

export interface ExaResult {
  url: string;
  title: string;
  text: string;
  publishedDate?: string;
}

/**
 * Scout a website and its surrounding web context using Exa.
 * Returns top results as structured text for feeding into the AI prompt.
 */
export async function scoutWebsite(
  url: string,
  companyName: string,
  maxResults = 8
): Promise<ExaResult[]> {
  const exa = getExa();

  try {
    // Search for content about the company
    const searchQuery = `${companyName} sito web prodotti servizi`;
    const results = await exa.searchAndContents(searchQuery, {
      type: 'neural',
      numResults: maxResults,
      text: { maxCharacters: 2000 },
      excludeDomains: ['reddit.com', 'quora.com', 'wikipedia.org'],
    });

    return (results.results || []).map((r) => ({
      url: r.url,
      title: r.title || '',
      text: r.text || '',
      publishedDate: r.publishedDate,
    }));
  } catch (err) {
    console.error('[Exa] scoutWebsite error:', err);
    return [];
  }
}

/**
 * Search for competitor intelligence on a sector/market.
 */
export async function searchCompetitors(
  query: string,
  maxResults = 15
): Promise<ExaResult[]> {
  const exa = getExa();

  const cached = getCached(query, maxResults);
  if (cached) return cached;

  try {
    const results = await exa.searchAndContents(query, {
      type: 'neural',
      numResults: maxResults,
      text: { maxCharacters: 3000 },
      excludeDomains: ['reddit.com', 'quora.com', 'wikipedia.org'],
      startPublishedDate: getRecentDate(18),
    });

    const mapped = (results.results || []).map((r) => ({
      url: r.url,
      title: r.title || '',
      text: r.text || '',
      publishedDate: r.publishedDate,
    }));

    setCached(query, maxResults, mapped);
    return mapped;
  } catch (err) {
    console.error('[Exa] searchCompetitors error:', err);
    return [];
  }
}

export function formatExaResultsForPrompt(results: ExaResult[]): string {
  if (results.length === 0) return 'Nessun risultato trovato dalla ricerca web.';

  return results
    .map(
      (r, i) =>
        `[FONTE ${i + 1}] ${r.title}\nURL: ${r.url}${r.publishedDate ? ` (${r.publishedDate})` : ''}\n${r.text}`
    )
    .join('\n\n---\n\n');
}
