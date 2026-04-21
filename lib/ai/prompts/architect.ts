/**
 * Architect — generates the granular chapter index for the Ghostwriter.
 * Uses a lightweight model (fast + cheap) since it only produces a JSON array.
 */

export const ARCHITECT_SYSTEM = `Sei il Chief Editor di un'analisi strategica di mercato.
Il tuo compito: generare la struttura editoriale ottimale per un report PMI italiano.

REGOLE:
- Produci un array JSON di chapter specs. Nient'altro.
- Il titolo di ogni capitolo deve essere specifico al settore/cliente (non generico).
- focus_instructions: istruzioni brutali e specifiche per lo scrittore.
- required_data_points: lista delle sezioni del ledger di ricerca rilevanti.
- Ogni capitolo target: minimo 800 parole.
- L'ultimo capitolo DEVE essere il HANDOFF_OPERATIVO (JSON strutturato).

Output: SOLO il JSON array, nient'altro.`;

export type EffortTier = 1 | 2 | 3 | 4;

export const TIER_CONFIG: Record<EffortTier, { chapterCount: number; wordsPerChapter: number; label: string }> = {
  1: { chapterCount: 20, wordsPerChapter: 750,  label: 'Core Intelligence (40 pag)' },
  2: { chapterCount: 28, wordsPerChapter: 800,  label: 'Advanced Market Map (60 pag)' },
  3: { chapterCount: 36, wordsPerChapter: 900,  label: 'Deep-Dive War Room (80 pag)' },
  4: { chapterCount: 45, wordsPerChapter: 950,  label: 'The Monolith (100+ pag)' },
};

export interface ChapterSpec {
  number: number;
  title: string;
  focus_instructions: string;
  required_data_points: string[];
  target_word_count: number;
  ledger_sections: ('market_data' | 'competitor_matrix' | 'verified_facts' | 'product_tech' | 'economics' | 'swoc' | 'all')[];
}

/**
 * Guarantee the last spec is always HANDOFF_OPERATIVO regardless of LLM output.
 */
export function enforceHandoffOperativo(specs: ChapterSpec[], targetWordCount = 500): ChapterSpec[] {
  const lastSpec = specs[specs.length - 1];
  if (lastSpec?.title?.toUpperCase().includes('HANDOFF')) return specs;
  return [
    ...specs,
    {
      number: (specs[specs.length - 1]?.number ?? specs.length) + 1,
      title: 'HANDOFF_OPERATIVO',
      focus_instructions: 'Scrivi SOLO il JSON HANDOFF_OPERATIVO strutturato con tutti i campi richiesti. Nient\'altro.',
      required_data_points: ['tutte le decisioni strategiche', 'roadmap', 'messaggi chiave', 'test immediati'],
      target_word_count: targetWordCount,
      ledger_sections: ['all'],
    },
  ];
}

export function buildArchitectPrompt(params: {
  clientName: string;
  sector: string;
  geography: string;
  tier: EffortTier;
  ledgerSummary: string;
  handoffData1Excerpt: string;
}): string {
  const config = TIER_CONFIG[params.tier];
  return `Genera l'indice editoriale per: **${params.clientName}** — Settore: ${params.sector} — ${params.geography}
Tier: ${params.tier} — Target: ${config.chapterCount} capitoli × ${config.wordsPerChapter} parole = ~${Math.round(config.chapterCount * config.wordsPerChapter / 500)} pagine

=== SINTESI BLUEPRINT STRATEGICO ===
${params.handoffData1Excerpt.slice(0, 3000)}

=== SINTESI RESEARCH LEDGER ===
${params.ledgerSummary.slice(0, 4000)}

Genera esattamente ${config.chapterCount} oggetti chapter + 1 capitolo finale HANDOFF_OPERATIVO.

Struttura JSON richiesta:
[
  {
    "number": 1,
    "title": "EXECUTIVE SUMMARY — [nome cliente]: Il Verdetto di Mercato",
    "focus_instructions": "Scrivi il verdetto brutale: dove si trova il cliente nel mercato adesso, i 3 competitor più pericolosi per nome, l'opportunità più urgente e cosa fare nei prossimi 30 giorni. Nessuna premessa, vai dritto al punto.",
    "required_data_points": ["TAM settore", "quota di mercato stimate", "top 3 competitor con prezzi"],
    "target_word_count": ${config.wordsPerChapter},
    "ledger_sections": ["market_data", "competitor_matrix"]
  },
  ...
  {
    "number": ${config.chapterCount + 1},
    "title": "HANDOFF_OPERATIVO",
    "focus_instructions": "Scrivi SOLO il JSON HANDOFF_OPERATIVO strutturato con tutti i campi richiesti. Nient'altro.",
    "required_data_points": ["tutte le decisioni strategiche", "roadmap", "messaggi chiave", "test immediati"],
    "target_word_count": 500,
    "ledger_sections": ["all"]
  }
]`;
}
