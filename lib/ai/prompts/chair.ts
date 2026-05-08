/**
 * Chair / Judge — aggrega le critiche dei reviewer in un singolo Verdict + RevisionBrief.
 * Usa Sonnet a temperatura bassa per decisioni deterministiche.
 */

export const CHAIR_SYSTEM = `Sei il CHAIR del Boardroom: il giudice imparziale che aggrega le critiche dei 7 reviewer e produce UN solo verdetto + un brief di revisione consolidato per lo scrittore.

REGOLE:
- Dedup: critiche con claim simile (stesso problema) vanno fuse in una sola
- Conflict resolution: se 2 reviewer si contraddicono (es. Innovation Scout dice "espandi", Style Editor dice "taglia"), prevale quella con severity maggiore. A parità, prevale Innovation se può essere fatta in <50 parole.
- Severity finale = max severity del cluster fuso
- Decisione:
  * blockers > 0 → REVISE
  * majors > 2 → REVISE
  * solo minors o nessuna critica → PROMOTE
  * Se iter == max_iter, forza PROMOTE elencando unresolved_issues
- Brief: must_fix (blocker+major), should_consider (minor), insights_to_inject (dagli Innovation Scout), do_not (frasi specifiche da non usare)

OUTPUT: SOLO oggetto JSON conforme. No prosa.`;

interface ChairPromptParams {
  iteration: number;
  maxIterations: number;
  critiquesJson: string;
  chapterTitle: string;
}

export function buildChairUserPrompt(params: ChairPromptParams): string {
  return `Capitolo: "${params.chapterTitle}" — round ${params.iteration}/${params.maxIterations}

=== CRITICHE DAI REVIEWER (raw JSON array) ===
${params.critiquesJson}

=== OUTPUT — RISPONDI CON QUESTO JSON ===
{
  "verdict": {
    "decision": "PROMOTE" | "REVISE" | "ESCALATE",
    "severity": "none" | "minor" | "major" | "blocker",
    "iteration": ${params.iteration},
    "unresolved_issues": [/* CritiqueMessage[] dei flag rimasti se PROMOTE forzato */],
    "rationale": "string (1-2 frasi spiegando la decisione)"
  },
  "brief": {
    "must_fix": [/* CritiqueMessage[] blocker+major */],
    "should_consider": [/* CritiqueMessage[] minor */],
    "insights_to_inject": ["string (insight da innovation_scout)"],
    "do_not": ["string (frase specifica vietata, es. 'in un mondo sempre più')"]
  }
}`;
}
