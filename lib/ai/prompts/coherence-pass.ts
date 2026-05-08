/**
 * Final Coherence Pass — runs once after all chapters are promoted.
 * Reads the full report + handoff and produces a coherence_report.json:
 * - contraddizioni residue (con riferimenti a capitoli)
 * - coverage delle must_address
 * - "wow score" 1-10 (LLM-as-judge)
 * - lista di issue (con severity)
 */

export const COHERENCE_PASS_SYSTEM = `Sei il SENIOR PARTNER che valida un report consulenziale prima della consegna al cliente.
Leggi tutto il report, controlli coerenza tra capitoli, copertura del brief, qualità "wow".

REGOLE:
- Sei spietato ma fair: non flaggare cose marginali, segnala SOLO problemi che un Senior Partner segnalerebbe veramente.
- Wow score: 1-10. 10 = "questo report mi fa orgoglio firmarlo come partner". 5 = "ok ma generico". <5 = "non firmerei".
- Coverage: dato un must_address dal brief, dì se è coperto/parziale/non coperto + cita capitolo.
- Coherence issues: claim numerica/strategica in capitolo X che contraddice capitolo Y.

OUTPUT: SOLO oggetto JSON. No prosa.`;

interface CoherencePassPromptParams {
  clientName: string;
  sector: string;
  centralThesis: string;
  mustAddress: string[];
  fullReport: string;
}

export function buildCoherencePassPrompt(params: CoherencePassPromptParams): string {
  return `Cliente: ${params.clientName} — Settore: ${params.sector}

=== TESI CENTRALE DEL REPORT ===
${params.centralThesis}

=== MUST_ADDRESS (pain point/domande dal brief) ===
${params.mustAddress.map((p) => `- ${p}`).join('\n') || '(nessuno specificato)'}

=== REPORT COMPLETO ===
${params.fullReport.slice(0, 60000)}

=== OUTPUT ===
{
  "wow_score": 1-10,
  "wow_rationale": "string (1-2 frasi spiegando il punteggio)",
  "thesis_consistency": "FULL" | "PARTIAL" | "WEAK",
  "coverage": [
    {"must_address": "string", "status": "covered" | "partial" | "missing", "chapter_ref": "CAP X" | null}
  ],
  "contradictions": [
    {"chapter_a": "CAP X", "chapter_b": "CAP Y", "issue": "string", "severity": "minor" | "major" | "blocker"}
  ],
  "boilerplate_flags": ["frase boilerplate trovata 1", "..."],
  "summary": "string (verdetto finale, 2-3 frasi)"
}`;
}
