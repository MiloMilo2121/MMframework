import { scoutWebsite, searchCompetitors, formatExaResultsForPrompt } from './exa';
import type { ToolName } from './tools';

/**
 * Executes a tool call and returns the result as a string.
 * Each tool maps to one or more Exa API calls.
 */
export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case 'search_web': {
        const query = String(args.query || '');
        const numResults = typeof args.num_results === 'number' ? args.num_results : 8;

        const results = await searchCompetitors(query, Math.min(numResults, 20));

        if (results.length === 0) {
          return `Nessun risultato trovato per la query: "${query}". Prova con termini più specifici o in inglese.`;
        }

        const formatted = formatExaResultsForPrompt(results);
        return `=== RISULTATI RICERCA WEB ===\nQuery: "${query}"\nRisultati trovati: ${results.length}\n\n${formatted}\n\n=== FINE RISULTATI ===`;
      }

      case 'search_competitors': {
        const competitorName = String(args.competitor_name || '');
        const competitorUrl = args.competitor_url ? String(args.competitor_url) : undefined;
        const focus = String(args.analysis_focus || 'full_profile');
        const context = String(args.market_context || '');

        // Build targeted query based on focus
        const queries: string[] = [];

        if (focus === 'pricing_and_offers' || focus === 'full_profile') {
          queries.push(`${competitorName} prezzi piani offerte ${context}`);
          queries.push(`${competitorName} pricing plans site:${competitorUrl?.replace(/https?:\/\//, '') || ''}`);
        }
        if (focus === 'marketing_channels' || focus === 'full_profile') {
          queries.push(`${competitorName} strategia marketing canali acquisizione clienti`);
        }
        if (focus === 'customer_reviews' || focus === 'full_profile') {
          queries.push(`${competitorName} recensioni clienti opinioni Trustpilot`);
        }
        if (focus === 'technology_stack' || focus === 'full_profile') {
          queries.push(`${competitorName} tecnologia stack software utilizzato`);
        }

        // Fallback if no specific queries
        if (queries.length === 0) {
          queries.push(`${competitorName} competitor analisi ${context}`);
        }

        const allResults: Awaited<ReturnType<typeof searchCompetitors>> = [];
        for (const q of queries.slice(0, 3)) {
          const r = await searchCompetitors(q, 5);
          allResults.push(...r);
        }

        // Deduplicate by URL
        const seen = new Set<string>();
        const unique = allResults.filter((r) => {
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        });

        // Also try direct URL if provided
        if (competitorUrl) {
          try {
            const directResults = await scoutWebsite(competitorUrl, competitorName, 3);
            unique.push(...directResults);
          } catch {
            // URL might not be scrapable — ignore
          }
        }

        if (unique.length === 0) {
          return `Nessun dato trovato su "${competitorName}". Potrebbe essere un'azienda locale poco presente online.`;
        }

        const formatted = formatExaResultsForPrompt(unique.slice(0, 10));
        return `=== ANALISI COMPETITOR: ${competitorName.toUpperCase()} ===\nFocus: ${focus}\n\n${formatted}\n\n=== FINE ANALISI COMPETITOR ===`;
      }

      case 'get_page_content': {
        const url = String(args.url || '');
        const goal = String(args.extraction_goal || '');

        if (!url.startsWith('http')) {
          return `URL non valido: "${url}". Deve iniziare con https://`;
        }

        try {
          const results = await scoutWebsite(url, goal, 1);
          if (results.length === 0 || !results[0].text) {
            return `Impossibile recuperare il contenuto di: ${url}. La pagina potrebbe essere protetta o JavaScript-rendered.`;
          }
          return `=== CONTENUTO PAGINA ===\nURL: ${url}\nGoal: ${goal}\n\n${results[0].text}\n\n=== FINE CONTENUTO ===`;
        } catch {
          return `Errore nel recupero di ${url}. Usa search_web per cercare informazioni su questo dominio.`;
        }
      }

      case 'search_reviews_and_sentiment': {
        const subject = String(args.subject || '');
        const sentimentFocus = String(args.sentiment_focus || 'all');
        const platforms = Array.isArray(args.platforms) ? args.platforms as string[] : ['Trustpilot', 'Google Reviews'];

        const platformStr = platforms.join(' OR ');
        const queries: string[] = [];

        if (sentimentFocus === 'pain_points' || sentimentFocus === 'all') {
          queries.push(`${subject} problemi lamentele recensioni negative ${platformStr}`);
        }
        if (sentimentFocus === 'buying_criteria' || sentimentFocus === 'all') {
          queries.push(`${subject} perché scegliere criteri acquisto valutazione`);
        }
        if (sentimentFocus === 'competitor_weaknesses' || sentimentFocus === 'all') {
          queries.push(`${subject} delusione problemi passare a alternativa migliore`);
        }
        if (sentimentFocus === 'success_stories' || sentimentFocus === 'all') {
          queries.push(`${subject} caso studio successo risultati ottenuti`);
        }

        const allResults: Awaited<ReturnType<typeof searchCompetitors>> = [];
        for (const q of queries.slice(0, 3)) {
          const r = await searchCompetitors(q, 6);
          allResults.push(...r);
        }

        if (allResults.length === 0) {
          return `Nessuna recensione trovata per "${subject}". Il prodotto/servizio potrebbe avere bassa presenza online.`;
        }

        const formatted = formatExaResultsForPrompt(allResults.slice(0, 12));
        return `=== RECENSIONI & SENTIMENT: ${subject.toUpperCase()} ===\nFocus: ${sentimentFocus}\nPiattaforme: ${platforms.join(', ')}\n\n${formatted}\n\n=== FINE RECENSIONI ===`;
      }

      case 'think': {
        // The "think" tool lets Claude reason explicitly — we acknowledge and continue
        return `Thought recorded. Proceed with your analysis.`;
      }

      default:
        return `Tool "${name}" non riconosciuto.`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error(`[tool-executor] Tool "${name}" failed:`, msg);
    return `Errore nell'esecuzione del tool "${name}": ${msg}. Procedi con le informazioni disponibili.`;
  }
}
