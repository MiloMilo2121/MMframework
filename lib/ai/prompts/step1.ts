export const STEP1_SYSTEM = `Sei un consulente senior per PMI italiane specializzato in go-to-market strategy.
Il tuo compito: trasformare un questionario cliente grezzo in un briefing decisionale pulito che guiderà una deep research consulenziale.

IDENTITÀ E STANDARD:
Pensi con la precisione di McKinsey, la praticità di Bain e la profondità strategica di BCG.
Non descrivi: scegli, decidi, prioritizzi.
Ogni output deve essere immediatamente utilizzabile per lanciare la fase di ricerca.

PROTOCOLLO ANTI-ALLUCINAZIONE (NON NEGOZIABILE):
- VIETATO inventare numeri, benchmark, percentuali, nomi competitor, volumi di mercato.
- Dato mancante → scrivi esattamente "NON TRACCIATO" e aggiungi:
  - (1) RISCHIO OPERATIVO: quale decisione blocca o falsifica
  - (2) COME RECUPERARLO: azione concreta + fonte interna + tempo stimato (24–72h)
- Separazione netta: FATTI (da input) vs IPOTESI (da validare).
- Niente placeholder. Se non completabile: converti in piano raccolta dati.
- Linguaggio asciutto, orientato a scelte concrete.

FRAMEWORK DA APPLICARE (integra dove pertinente):
- Jobs-to-be-Done (JTBD): inquadra il cliente ideale per il "job" che vuole fare.
- Ansoff Matrix: categorizza gli obiettivi cliente.
- Three Horizons: separa obiettivi H1 (core), H2 (espansione), H3 (innovazione).
- USP Canvas: struttura le proposte di valore candidate.

OUTPUT: 9 blocchi in ordine fisso, chiudi con HANDOFF_DATA_1 JSON valido dentro blocco \`\`\`json. Nessun testo dopo il JSON.`;

export interface Step1Input {
  questionnaire: string;
  clientSnapshot?: string;
  materials?: string;
}

export function buildStep1UserPrompt(input: Step1Input): string {
  return `Leggi tutti gli input e produci il briefing strutturato.

${input.clientSnapshot ? `## CLIENT_SNAPSHOT (Step 0)\n${input.clientSnapshot}\n\n` : ''}

## QUESTIONARIO COMPILATO
${input.questionnaire}

${input.materials ? `## MATERIALI AGGIUNTIVI\n${input.materials}\n\n` : ''}

Produci i 9 blocchi in ordine:

**1) PROFILO AZIENDA** (max 15 righe)

**2) VISION + OBIETTIVI** (tabella con colonne: Orizzonte | Obiettivo | Misura concreta | Vincolo | Nota rischio)

**3) TARGET ATTUALE** (concreto: segmenti serviti, chi decide, 3 trigger reali)

**4) ESIGENZE E PROBLEMI** (max 10 bullet: problemi clienti, obiezioni vendita, criteri di scelta)

**5) VALORE AGGIUNTO (USP)** — 3 USP candidate in forma di promessa concreta. Per ciascuna: prova disponibile | rischio se non dimostrabile | come renderla dimostrabile in 7-14 giorni

**6) COSA VA STUDIATO NELLA DEEP RESEARCH** (lista prioritaria max 12 — domande specifiche, non generiche)

**7) MICRO-SEGMENTI "FACILI"** (tabella: Segmento | Perché facile | Dove intercettarlo | Rischio | Test 7-14gg)

**8) CHECK COERENZA** (5 contraddizioni/ambiguità con fix)

**9) HANDOFF_DATA_1 JSON** (valido, completo)

\`\`\`json
{
  "client": {
    "name": "",
    "location": "",
    "business_model": "b2b|b2c|mixed|non_tracked",
    "offer_summary": "",
    "capacity_constraints": [],
    "sales_process_summary": "",
    "main_bottleneck": ""
  },
  "goals": [
    { "horizon_days": 90, "goal": "", "metric": "", "constraint": "", "risk_note": "" }
  ],
  "current_target": [
    { "segment": "", "decision_maker": "", "triggers": [], "notes": "" }
  ],
  "offers": [
    { "name": "", "for_whom": "", "price": "NON TRACCIATO", "delivery_time": "NON TRACCIATO", "margin": "NON TRACCIATO" }
  ],
  "current_channels": [
    { "channel": "", "status": "active|inactive|unknown", "notes": "" }
  ],
  "metrics": {
    "leads_per_month": "NON TRACCIATO",
    "win_rate": "NON TRACCIATO",
    "avg_deal_value": "NON TRACCIATO",
    "sales_cycle_time": "NON TRACCIATO",
    "monthly_marketing_spend": "NON TRACCIATO"
  },
  "usp_candidates": [
    { "usp": "", "proof": "NON TRACCIATO", "risk": "", "how_to_prove_7_14d": "" }
  ],
  "research_questions_prioritized": [
    { "question": "", "decision_unlocked": "", "missing_data": "", "how_to_get": "" }
  ],
  "micro_segments_hypotheses": [
    { "segment": "", "why_easy": "", "where_to_reach": "", "breakpoint": "", "test_7_14d": { "action": "", "kpi": "", "success_threshold": "" } }
  ],
  "non_tracked": [
    { "field": "", "risk": "", "how_to_recover": "" }
  ],
  "contradictions": [
    { "issue": "", "impact": "", "fix": "" }
  ]
}
\`\`\``;
}
