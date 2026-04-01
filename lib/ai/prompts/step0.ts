export const STEP0_SYSTEM = `Sei un analista di intelligence commerciale. Esegui ricognizioni rapide e verificabili su aziende e professionisti usando SOLO fonti pubbliche. Il tuo output alimenta una pipeline di analisi di mercato consulenziale — ogni errore si propaga.

PROTOCOLLO ANTI-ALLUCINAZIONE (NON NEGOZIABILE):
- Non inventare MAI. Se non trovi: scrivi "NON TROVATO" e stop.
- Zero supposizioni su dati non pubblici (personali, finanziari interni).
- Ogni affermazione = fonte trovata in questa sessione.
- Se non puoi navigare o accedere: produci "Piano raccolta" con azioni concrete.
- Separa sempre OSSERVABILE (da web) da INFERITO (tua interpretazione).

OUTPUT: segui la struttura CLIENT_SNAPSHOT esatta specificata nell'input.
Chiudi sempre con JSON valido dentro blocco \`\`\`json. Nessun testo dopo il JSON.`;

export interface Step0Input {
  clientName: string;
  websiteUrl: string;
  country?: string;
  note?: string;
  webContext?: string;
}

export function buildStep0UserPrompt(input: Step0Input): string {
  return `Esegui la ricognizione su:
- Nome cliente: ${input.clientName}
- Sito web: ${input.websiteUrl}
- Paese/area: ${input.country || 'Italia'}
- Nota: ${input.note || 'nessuna'}

${input.webContext ? `CONTESTO WEB RACCOLTO:\n${input.webContext}\n` : ''}

Produci in ordine:

**1) SNAPSHOT** (max 12 righe)
- Chi è (azienda/professionista)
- Cosa fa (in 1 riga)
- Settore e sottosettore
- Dove opera (geografia/mercati)
- A chi vende (B2B/B2C e tipologia cliente)
- Come vende (segnali: preventivo, e-commerce, appuntamenti, abbonamento, ecc.)

**2) COSA VENDONO** (bullet, max 8)
- Prodotti/servizi principali

**3) SEGNALI COMMERCIALI OSSERVABILI** (tabella)
| Segnale | Evidenza | Implicazione |
|---------|----------|--------------|

**4) POSIZIONAMENTO** (max 6 righe)
- Premium/medio/basso (solo se osservabile)
- 3 parole chiave ripetute (linguaggio del brand)
- 3 differenziatori dichiarati

**5) 5 DOMANDE INTELLIGENTI DA FARE IN CALL**
Formato: Domanda → Quale gap colma → Perché serve per l'analisi

**6) RISCHI DI LETTURA ERRATA** (max 5)
- Dove potrei sbagliarmi

**7) FONTI** (elenco puntato — pagine specifiche visitate)

**8) CLIENT_SNAPSHOT JSON** (valido, chiude il documento)

\`\`\`json
{
  "client_name": "",
  "website": "",
  "type": "company|professional|unknown",
  "sector": "",
  "subsector": "",
  "locations": [],
  "business_model_guess": "b2b|b2c|mixed|unknown",
  "offers": [],
  "observable_sales_signals": [],
  "positioning_notes": [],
  "open_questions_for_call": [],
  "risks_of_misread": [],
  "sources": []
}
\`\`\`

Avvia ricognizione ora.`;
}
