# SalesMap Intelligence — Claude Code Instructions

## Progetto
Applicazione Next.js 14 che genera analisi di mercato di livello McKinsey/BCG per PMI italiane.
Pipeline AI: Step 0 (scouting web) → Step 1 (blueprint) → Step 2 (deep research SSE, 14 capitoli) → Step 3 (conclusioni).

## Struttura chiave
- `lib/ai/prompts/` → mega-prompt AI. NON modificare la struttura senza istruzioni esplicite.
- `lib/parsers/` → estrazione JSON dal markdown. Fragile: testare sempre dopo modifiche.
- `components/report/` → componenti visual del report. Seguono design system in `styles/report.css`.
- `app/api/` → route API con SSE streaming. Timeout: 300s per step2, 120s per step1/3, 60s per step0.
- `lib/store/analysis-store.ts` → Zustand persist. Non aggiungere campi grandi senza considerare localStorage quota.

## Brand Colors (non cambiare)
```
--accent-primary: #AAD8D8
--accent-dark: #244F4F
--accent-deepest: #022226
--text-primary: #1A2E2E
--text-secondary: #5A7878
--surface: #F8FAFA
--border-brand: #E2EDED
```

## Pattern SSE standard (SEMPRE usare questo pattern per streaming)
```typescript
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(
          `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        ));
      };
      const keepalive = setInterval(() => {
        try { send('ping', { ts: Date.now() }); } catch { /* closed */ }
      }, 15000);
      try {
        // ... logica streaming ...
      } finally {
        clearInterval(keepalive);
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

## OpenRouter + Extended Thinking
- Usa OpenAI SDK con `baseURL: 'https://openrouter.ai/api/v1'`
- Extended thinking: `{ thinking: { type: 'enabled', budget_tokens: N } }` nel body (non nei params standard)
- Content blocks thinking vengono prima dei text — filtra `delta.content` di tipo stringa
- Prompt cache: `cache_control: { type: 'ephemeral' }` dentro l'oggetto system message content

## Response Healing
- `lib/ai/response-healing.ts` — retry se manca marker (`---END_PART_1---` o `HANDOFF_OPERATIVO`)
- Max 2 retry. Non riparte dall'inizio: chiede al modello di continuare dall'ultimo testo.

## JSON Extraction
- `lib/parsers/extract-json.ts` — estrae ultimo blocco ```json``` o fallback a `{}` bilanciato
- Sempre validare con Zod (soft validation: passare i dati anche se schema non è perfetto)

## Variabili d'ambiente richieste
```
OPENROUTER_API_KEY=sk-or-...
EXA_API_KEY=exa-...
ANTHROPIC_API_KEY=sk-ant-...    # opzionale, fallback
NEXT_PUBLIC_APP_URL=http://localhost:3000
STEP0_MODEL=anthropic/claude-3-5-haiku-20241022
STEP1_MODEL=anthropic/claude-opus-4-5
STEP2_MODEL=anthropic/claude-opus-4-5
STEP3_MODEL=anthropic/claude-3-5-haiku-20241022
STEP2_PROVIDER=Anthropic
```

## Avvio
```bash
npm run dev   # http://localhost:3000
npm run build # verifica TypeScript e build
```

## Commit convention
```
feat: <descrizione breve>
fix: <bug fix>
chore: <manutenzione>
```
