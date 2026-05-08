/**
 * Strategist — first layer of the planning trio.
 * Decides: tesi centrale, angolo narrativo, posizionamento, framework selezionati,
 * insight contro-intuitivi da sfruttare, e i pain point del brief che non si possono
 * mancare. Il suo output guida Architect e Outliner.
 */

export const STRATEGIST_SYSTEM = `Sei lo Strategist di un team consulenziale top-tier (McKinsey/BCG/Bain).
Il tuo unico compito: decidere la TESI CENTRALE dell'analisi prima ancora di scrivere capitoli.

REGOLE FERREE:
- Una tesi è una proposizione DIFENDIBILE che il report deve dimostrare. Non un titolo, non un tema.
- L'angolo narrativo è la lente attraverso cui leggere TUTTI i dati. Es: "Il cliente è in 'survivor mode' ma ha un'arma non riconosciuta che cambia il gioco se monetizzata correttamente."
- Il posizionamento è la frase che il cliente userà per convincere il proprio CdA: brevissima, memorabile, falsificabile.
- I framework selezionati DEVONO essere tra quelli forniti — usa l'ID, non parafrasi.
- I contrarian_insights sono ipotesi controintuitive supportate (anche debolmente) dal ledger. Vietate banalità tipo "il digitale è importante".
- must_address: lista LETTERALE dei pain point/domande del questionnaire e blueprint che il report deve dirimere.
- must_avoid: frasi/concetti boilerplate da bandire (es. "approccio strutturato", "in un mondo sempre più", "occorre fare lean").

OUTPUT: SOLO un oggetto JSON valido conforme allo schema. Nessun preambolo, nessun trailing text.`;

interface StrategistPromptParams {
  clientName: string;
  sector: string;
  geography: string;
  ledgerSummary: string;
  handoffData1Excerpt: string;
  questionnaireExcerpt?: string;
  frameworksBlock: string;
  availableFrameworkIds: string[];
}

export function buildStrategistPrompt(params: StrategistPromptParams): string {
  return `Cliente: **${params.clientName}** — Settore: ${params.sector} — ${params.geography}

=== BRIEF DEL CLIENTE (da blueprint) ===
${params.handoffData1Excerpt.slice(0, 3000)}

${params.questionnaireExcerpt ? `=== QUESTIONARIO ESTRATTO ===\n${params.questionnaireExcerpt.slice(0, 1500)}\n` : ''}
=== SINTESI RESEARCH LEDGER ===
${params.ledgerSummary.slice(0, 4000)}

=== FRAMEWORK DISPONIBILI (usa SOLO questi ID in selected_frameworks) ===
ID disponibili: ${params.availableFrameworkIds.join(', ')}

${params.frameworksBlock.slice(0, 3500)}

=== OUTPUT — RISPONDI CON QUESTO JSON ===
{
  "central_thesis": "string (1 frase, proposizione difendibile)",
  "narrative_angle": "string (la lente unica attraverso cui leggere i dati)",
  "positioning_statement": "string (frase memorabile per il CdA cliente, max 25 parole)",
  "selected_frameworks": ["framework_id_1", "framework_id_2", ...],
  "contrarian_insights": ["insight 1", "insight 2", ...] (3-5 elementi),
  "must_address": ["pain point/domanda 1", "..."] (5-10 elementi dal brief),
  "must_avoid": ["frase vietata 1", "..."] (almeno 5 banalità da bandire)
}`;
}
