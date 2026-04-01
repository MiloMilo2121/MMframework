import type OpenAI from 'openai';

/**
 * Tool definitions in OpenAI function-calling format.
 * These are passed to claude-opus-4-6 via OpenRouter so Claude
 * can autonomously decide what to search, when to search it,
 * and how many times — up to MAX_TOOL_CALLS per generation.
 */
export const RESEARCH_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: `Cerca informazioni aggiornate su mercati, settori, trend, normative, statistiche, dati economici italiani ed europei.
Usa questo tool ogni volta che hai bisogno di:
- Dati di mercato (TAM, SAM, SOM, crescita annua, valore del settore)
- Trend recenti (ultimi 12-24 mesi) nel settore del cliente
- Normative, leggi, regolamenti rilevanti (es. GDPR, Codice del Consumo, normative di settore)
- Benchmark (NPS medio settore, costo acquisizione cliente medio, margini tipici)
- Fonti primarie verificabili da citare nel report
- Qualsiasi dato che non conosci con certezza`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query di ricerca precisa e specifica. Includi SEMPRE l\'anno 2025 nella query e privilegia fonti degli ultimi 12-24 mesi. Esempio BUONO: "mercato software gestionale PMI Italia 2025 valore crescita" oppure "competitor CRM B2B Italia 2025 prezzi posizionamento". Esempio CATTIVO: "software gestionale" (troppo generico, senza anno).',
          },
          search_type: {
            type: 'string',
            enum: ['market_data', 'competitor_intel', 'regulatory', 'pricing', 'trends', 'case_study', 'technology', 'general'],
            description: 'Tipo di ricerca per ottimizzare i risultati',
          },
          num_results: {
            type: 'number',
            description: 'Numero di risultati da recuperare (default 8, max 20 per ricerche competitor)',
          },
        },
        required: ['query', 'search_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_competitors',
      description: `Analisi approfondita di un competitor specifico. Recupera: pricing visibile, messaggi commerciali, canali usati, posizionamento, recensioni, tecnologie, punti deboli.
Usa questo tool per OGNI competitor rilevante identificato. Non fermarti a nominare competitor senza aver cercato dati concreti su di essi.
Aggiungi sempre l'anno 2025 nelle query. Privilegia fonti degli ultimi 12-24 mesi per avere dati attuali su pricing e posizionamento.`,
      parameters: {
        type: 'object',
        properties: {
          competitor_name: {
            type: 'string',
            description: 'Nome esatto del competitor',
          },
          competitor_url: {
            type: 'string',
            description: 'URL del sito del competitor se disponibile',
          },
          analysis_focus: {
            type: 'string',
            enum: ['pricing_and_offers', 'marketing_channels', 'customer_reviews', 'technology_stack', 'full_profile'],
            description: 'Aspetto specifico da analizzare',
          },
          market_context: {
            type: 'string',
            description: 'Contesto di mercato (settore + paese + target) per contestualizzare la ricerca',
          },
        },
        required: ['competitor_name', 'analysis_focus'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_page_content',
      description: `Recupera il contenuto completo di una pagina web specifica. Usa quando hai un URL preciso da analizzare:
- Pagina prezzi di un competitor
- Comunicato stampa
- Studio di mercato pubblico
- Report di settore online
- Profilo LinkedIn/Instagram/Trustpilot di un competitor`,
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: "URL completo della pagina da analizzare (deve iniziare con https://)",
          },
          extraction_goal: {
            type: 'string',
            description: 'Cosa stai cercando in questa pagina (es. "prezzi e piani", "messaggi chiave", "recensioni clienti")',
          },
        },
        required: ['url', 'extraction_goal'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_reviews_and_sentiment',
      description: `Cerca recensioni, feedback clienti, forum, discussioni su un prodotto/servizio/azienda. Fondamentale per:
- Capire i pain point reali dei clienti del settore
- Trovare le obiezioni più comuni all'acquisto
- Identificare i criteri di scelta effettivi (non dichiarati)
- Trovare casi di clienti insoddisfatti dei competitor (opportunità)`,
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: "Soggetto della ricerca (nome prodotto, nome competitor, categoria prodotto)",
          },
          platforms: {
            type: 'array',
            items: { type: 'string' },
            description: 'Piattaforme dove cercare (es. ["Trustpilot", "Google Reviews", "Capterra", "Reddit", "Trustpilot.it"])',
          },
          sentiment_focus: {
            type: 'string',
            enum: ['pain_points', 'buying_criteria', 'competitor_weaknesses', 'success_stories', 'all'],
            description: 'Focus dell\'analisi del sentiment',
          },
        },
        required: ['subject', 'sentiment_focus'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'think',
      description: `Usa questo tool per ragionare esplicitamente PRIMA di fare una ricerca o PRIMA di scrivere una sezione critica.
Aiuta a: pianificare quali ricerche fare, valutare risultati di tool calls precedenti, decidere se un capitolo è sufficientemente supportato da evidenze, identificare contraddizioni nei dati trovati.
NON usarlo per scrivere contenuto del report — solo per ragionamento interno.
Quando usarlo:
- PRIMA di ogni capitolo: pianifica le 2-3 ricerche più critiche specifiche per quel capitolo
- DOPO ogni gruppo di ricerche: valuta se i dati trovati sono sufficienti o servono altre ricerche
- PRIMA di scrivere dati numerici critici: verifica coerenza con le fonti trovate`,
      parameters: {
        type: 'object',
        properties: {
          thought: {
            type: 'string',
            description: 'Il tuo ragionamento interno — pianificazione ricerche, valutazione evidenze, decisioni strategiche',
          },
        },
        required: ['thought'],
      },
    },
  },
];

export type ToolName = 'search_web' | 'search_competitors' | 'get_page_content' | 'search_reviews_and_sentiment' | 'think';

export interface ToolCall {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

/** Maximum number of tool calls per generation pass to prevent infinite loops */
export const MAX_TOOL_CALLS = 25;
