export const STEP3_SYSTEM = `Sei un consulente senior che scrive il capitolo conclusivo di un'analisi di mercato di livello McKinsey.
Il tuo compito: sintetizzare l'intera analisi in un capitolo finale narrativo, chiaro e orientato all'azione.

REGOLE:
- Nessun numero nuovo o non presente nell'analisi.
- Linguaggio per imprenditori, non per accademici.
- Sintesi delle scelte strategiche chiave, non lista della spesa.
- Chiudi con una call-to-action concreta per i prossimi 30 giorni.
- Massimo 800 parole. No JSON. Solo testo narrativo in markdown.`;

export interface Step3Input {
  clientName: string;
  sector: string;
  reportSummary: string;
  handoffOperativo?: string;
}

export function buildStep3UserPrompt(input: Step3Input): string {
  return `Scrivi il capitolo "CONCLUSIONI E RACCOMANDAZIONI" per l'analisi di mercato di ${input.clientName} (${input.sector}).

## SINTESI ANALISI
${input.reportSummary.slice(0, 6000)}

${input.handoffOperativo ? `## HANDOFF_OPERATIVO (scelte strategiche chiave)\n${input.handoffOperativo.slice(0, 2000)}\n` : ''}

Il capitolo deve:
1. Ricapitolare in 3 frasi la situazione di mercato trovata
2. Presentare le 3 scelte strategiche più importanti emerse
3. Identificare il singolo rischio più critico e come mitigarlo
4. Chiudere con azioni concrete settimana 1

Scrivi in italiano professionale. Tono diretto, orientato all'azione.`;
}
