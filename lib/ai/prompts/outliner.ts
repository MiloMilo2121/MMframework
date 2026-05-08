/**
 * Outliner — second layer of the planning trio.
 * Per ogni capitolo, decide sub-points specifici, anchor dati dal ledger,
 * lente di framework, hook di innovazione. Il suo output guida il Writer.
 */

export const OUTLINER_SYSTEM = `Sei l'Outliner: tu trasformi un capitolo astratto in un piano chirurgico.
Per ogni capitolo ricevi titolo, focus, target words, tesi del report, framework disponibili.
Produci una OUTLINE granulare: 4-6 sub-points concreti, ognuno con dati specifici da citare.

REGOLE:
- I sub-points sono blocchi narrativi NON sezioni accademiche. NO "Introduzione/Sviluppo/Conclusione".
- data_anchors: chiavi specifiche del ledger (es. "competitor:Acme:pricing", "market_data:CAGR:2025") o claim verificati. Se il dato manca, scrivi "GAP: [cosa manca]" così il Writer sa che deve flaggare.
- framework_lens: ID di un framework dell'elenco fornito (opzionale per sub-point).
- thesis_link: spiega in 1 frase come questo capitolo serve la tesi centrale.
- innovation_hooks: 1-3 angoli "wow" specifici per questo capitolo (es. "il dato che ribalta la narrazione consensuale del settore").
- target_words sui sub-points DEVONO sommare a circa il target_word_count del capitolo.

OUTPUT: SOLO l'oggetto JSON.`;

interface OutlinerPromptParams {
  chapterNumber: number;
  chapterTitle: string;
  focusInstructions: string;
  targetWordCount: number;
  centralThesis: string;
  narrativeAngle: string;
  ledgerSlice: string;
  frameworksBlock: string;
  availableFrameworkIds: string[];
  previousChapterTitles: string[];
}

export function buildOutlinerPrompt(params: OutlinerPromptParams): string {
  return `Capitolo da pianificare:

CAP ${params.chapterNumber} — ${params.chapterTitle}
Focus: ${params.focusInstructions}
Target parole: ${params.targetWordCount}

=== TESI CENTRALE DEL REPORT ===
${params.centralThesis}

=== ANGOLO NARRATIVO ===
${params.narrativeAngle}

${params.previousChapterTitles.length > 0 ? `=== CAPITOLI PRECEDENTI (per non duplicare) ===\n${params.previousChapterTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n` : ''}
=== LEDGER SLICE (dati disponibili) ===
${params.ledgerSlice.slice(0, 6000)}

=== FRAMEWORK DISPONIBILI (per framework_lens, usa SOLO questi ID) ===
${params.availableFrameworkIds.join(', ')}

${params.frameworksBlock.slice(0, 2000)}

=== OUTPUT — RISPONDI CON QUESTO JSON ===
{
  "chapter_number": ${params.chapterNumber},
  "thesis_link": "string (come questo capitolo serve la tesi centrale)",
  "innovation_hooks": ["hook 1", "hook 2", ...],
  "sub_points": [
    {
      "title": "string (titolo del sotto-blocco)",
      "target_words": number,
      "data_anchors": ["anchor 1", "anchor 2", ...],
      "framework_lens": "framework_id_or_omit"
    }
  ]
}`;
}
