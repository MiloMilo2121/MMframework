/**
 * Orchestrator — the Pentathlon Smart-Router for Step 2 Deep Research.
 *
 * Phase A: Build ResearchLedger from client context
 * Phase B: Promise.allSettled — 4 Miner Workers in parallel + 1 Challenger
 * Phase C: Architect + Ghostwriter — generates chapter index then writes in parallel batches
 */
import { NextRequest } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { runWorker } from '@/lib/ai/workers';
import {
  createEmptyLedger,
  mergeLedger,
  type ContradictionEntry,
} from '@/lib/types/research-ledger';
import {
  PHASE_A_MARKET_DYNAMICS,
  PHASE_A_COMPETITOR,
  PHASE_A_PRODUCT_TECH,
  PHASE_A_ECONOMICS,
  PHASE_C_MARKET_DYNAMICS,
  PHASE_C_COMPETITOR,
  PHASE_C_PRODUCT_TECH,
  PHASE_C_ECONOMICS,
  WORKER_CHALLENGER_SYSTEM,
  buildWorkerQueryPrompt,
  buildWorkerExtractPrompt,
  buildChallengerUserPrompt,
} from '@/lib/ai/prompts/step2-workers';
import { writeChaptersBatched } from '@/lib/ai/ghostwriter';
import {
  type ChapterSpec,
  buildArchitectPrompt,
  enforceHandoffOperativo,
  TIER_CONFIG,
  ARCHITECT_SYSTEM,
  type EffortTier,
} from '@/lib/ai/prompts/architect';
import { CostTracker } from '@/lib/ai/cost-tracker';
import { parseHandoffOperativo } from '@/lib/parsers/parse-handoff';
import { extractContextBridge } from '@/lib/parsers/parse-report';
import { healResponse } from '@/lib/ai/response-healing';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    clientSnapshot: string;
    handoffData1: string;
    questionnaire?: string;
    materials?: string;
    analysisId?: string;
    effort_tier?: number;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const keepalive = setInterval(() => {
        send('ping', { ts: Date.now() });
      }, 15000);

      try {
        const minerModel = process.env.MINER_MODEL || 'deepseek/deepseek-r1';
        const coherenceModel = process.env.COHERENCE_MODEL || process.env.STEP2_MODEL || 'anthropic/claude-opus-4-6';

        // ── Phase A: Build initial ledger ────────────────────────────────────
        send('status', { phase: 'init', message: '🏗️ Costruzione Research Ledger...', step: 'init' });

        let clientSnapshotParsed: Record<string, unknown> = {};
        let handoffData1Parsed: Record<string, unknown> = {};
        try { clientSnapshotParsed = JSON.parse(body.clientSnapshot || '{}'); } catch { /* ok */ }
        try { handoffData1Parsed = JSON.parse(body.handoffData1 || '{}'); } catch { /* ok */ }

        const clientName = String(
          (clientSnapshotParsed as { client_name?: string }).client_name ||
          (handoffData1Parsed as { client?: { name?: string } }).client?.name ||
          'Cliente'
        );
        const sector = String(
          (clientSnapshotParsed as { sector?: string }).sector ||
          (handoffData1Parsed as { client?: { sector?: string } }).client?.sector ||
          'Settore'
        );
        const geography = String(
          (clientSnapshotParsed as { locations?: string[] }).locations?.[0] || 'Italia'
        );

        // Build context slice for Workers
        const contextSlice = buildContextSlice(body.clientSnapshot, body.handoffData1, body.questionnaire);

        const ledger = createEmptyLedger({
          analysisId: body.analysisId || 'unknown',
          clientName,
          sector,
          initialContext: {
            client_summary: contextSlice.slice(0, 2000),
            business_model: String((handoffData1Parsed as { client?: { business_model?: string } }).client?.business_model || 'unknown'),
            geography,
            offers_summary: contextSlice.slice(0, 500),
            key_questions: [],
            known_competitors: [],
          },
        });

        // ── Phase B: Run 4 Miners in parallel ───────────────────────────────
        send('status', { phase: 'workers', message: `⚡ Avvio 4 Worker in parallelo con ${minerModel}...`, step: 'workers_start' });
        send('module_status', { workerId: 'market_dynamics', status: 'running', toolCalls: 0 });
        send('module_status', { workerId: 'competitor_intelligence', status: 'running', toolCalls: 0 });
        send('module_status', { workerId: 'product_tech', status: 'running', toolCalls: 0 });
        send('module_status', { workerId: 'economics_pricing', status: 'running', toolCalls: 0 });

        const workerResults = await Promise.allSettled([
          runWorker({
            moduleId: 'market_dynamics',
            systemPrompt: PHASE_C_MARKET_DYNAMICS,
            userPrompt: buildWorkerExtractPrompt('market_dynamics', contextSlice),
            model: minerModel,
            queryGenSystemPrompt: PHASE_A_MARKET_DYNAMICS,
            queryGenUserPrompt: buildWorkerQueryPrompt('market_dynamics', contextSlice),
          }),
          runWorker({
            moduleId: 'competitor_intelligence',
            systemPrompt: PHASE_C_COMPETITOR,
            userPrompt: buildWorkerExtractPrompt('competitor_intelligence', contextSlice),
            model: minerModel,
            queryGenSystemPrompt: PHASE_A_COMPETITOR,
            queryGenUserPrompt: buildWorkerQueryPrompt('competitor_intelligence', contextSlice),
          }),
          runWorker({
            moduleId: 'product_tech',
            systemPrompt: PHASE_C_PRODUCT_TECH,
            userPrompt: buildWorkerExtractPrompt('product_tech', contextSlice),
            model: minerModel,
            queryGenSystemPrompt: PHASE_A_PRODUCT_TECH,
            queryGenUserPrompt: buildWorkerQueryPrompt('product_tech', contextSlice),
          }),
          runWorker({
            moduleId: 'economics_pricing',
            systemPrompt: PHASE_C_ECONOMICS,
            userPrompt: buildWorkerExtractPrompt('economics_pricing', contextSlice),
            model: minerModel,
            queryGenSystemPrompt: PHASE_A_ECONOMICS,
            queryGenUserPrompt: buildWorkerQueryPrompt('economics_pricing', contextSlice),
          }),
        ]);

        // Merge Worker outputs into ledger
        for (const result of workerResults) {
          if (result.status === 'fulfilled') {
            const output = result.value;
            mergeLedger(ledger, output);
            send('module_status', {
              workerId: output.module_id,
              status: output.status,
              toolCalls: output.tool_calls_used,
              message: output.error_message,
            });
          } else {
            console.error('[orchestrator] Worker failed:', result.reason);
          }
        }

        const completedWorkers = workerResults.filter((r) => r.status === 'fulfilled').length;
        send('status', {
          phase: 'challenger',
          message: `✅ ${completedWorkers}/4 Worker completati. Avvio Challenger...`,
          step: 'challenger_start',
        });
        send('module_status', { workerId: 'swoc_synthesis', status: 'running', toolCalls: 0 });

        // ── Phase B.5: Challenger cross-validation ───────────────────────────
        const w1 = ledger.modules.market_dynamics?.structured_data || ledger.modules.market_dynamics?.summary_markdown.slice(0, 2000) || '{}';
        const w2 = ledger.modules.competitor_intelligence?.structured_data || ledger.modules.competitor_intelligence?.summary_markdown.slice(0, 2000) || '{}';
        const w3 = ledger.modules.product_tech?.structured_data || ledger.modules.product_tech?.summary_markdown.slice(0, 2000) || '{}';
        const w4 = ledger.modules.economics_pricing?.structured_data || ledger.modules.economics_pricing?.summary_markdown.slice(0, 2000) || '{}';

        const challengerOutput = await runWorker({
          moduleId: 'swoc_synthesis',
          systemPrompt: WORKER_CHALLENGER_SYSTEM,
          userPrompt: buildChallengerUserPrompt(contextSlice, w1, w2, w3, w4),
          model: minerModel,
        });

        mergeLedger(ledger, challengerOutput);

        // Extract contradictions from challenger output
        if (challengerOutput.structured_data) {
          try {
            const parsed = JSON.parse(challengerOutput.structured_data) as {
              contradictions_found?: ContradictionEntry[];
            };
            if (Array.isArray(parsed.contradictions_found)) {
              ledger.contradictions_log.push(...parsed.contradictions_found);
            }
          } catch { /* ok */ }
        }

        send('module_status', {
          workerId: 'swoc_synthesis',
          status: challengerOutput.status,
          toolCalls: challengerOutput.tool_calls_used,
          contradictions: ledger.contradictions_log.length,
        });

        // ── Phase C: Architect + Ghostwriter ────────────────────────────────
        const tier = (([1, 2, 3, 4].includes(body.effort_tier ?? 0) ? body.effort_tier : 2) ?? 2) as EffortTier;
        const tierConfig = TIER_CONFIG[tier];
        const costTracker = new CostTracker(tier);

        send('status', {
          phase: 'architect',
          message: `🏗️ Architect: generazione indice editoriale (Tier ${tier} — ${tierConfig.label})...`,
          step: 'architect_start',
        });

        // Build ledger summary for architect
        const ledgerSummary = [
          ledger.modules.market_dynamics?.summary_markdown?.slice(0, 1000) || '',
          ledger.modules.competitor_intelligence?.summary_markdown?.slice(0, 1000) || '',
          ledger.modules.product_tech?.summary_markdown?.slice(0, 500) || '',
          ledger.modules.economics_pricing?.summary_markdown?.slice(0, 500) || '',
          `Fatti verificati: ${ledger.verified_facts.length} | Competitor: ${ledger.competitor_matrix.length}`,
        ].filter(Boolean).join('\n\n');

        const architectModel = process.env.STEP1_MODEL || 'anthropic/claude-opus-4-6';

        const architectPrompt = buildArchitectPrompt({
          clientName,
          sector,
          geography,
          tier,
          ledgerSummary,
          handoffData1Excerpt: body.handoffData1 || '',
        });

        const architectResponse = await openrouter.chat.completions.create({
          model: architectModel,
          max_tokens: 8000,
          temperature: 0.3,
          stream: false,
          messages: [
            { role: 'system', content: ARCHITECT_SYSTEM },
            { role: 'user', content: architectPrompt },
          ],
        });

        let chapterSpecs: ChapterSpec[] = [];
        const architectResponse2 = architectResponse as { choices?: Array<{ message?: { content?: string | null }; }>, usage?: { prompt_tokens?: number; completion_tokens?: number } };
        const architectRaw = architectResponse2.choices?.[0]?.message?.content || '[]';
        costTracker.add(architectModel, architectResponse2.usage, 'architect');
        try {
          const cleaned = architectRaw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
          chapterSpecs = JSON.parse(cleaned) as ChapterSpec[];
        } catch {
          send('warning', { message: '⚠️ Architect JSON parse error — fallback a struttura minima', code: 'ARCHITECT_PARSE_ERROR' });
          chapterSpecs = [];
        }

        if (chapterSpecs.length === 0) {
          chapterSpecs = Array.from({ length: tierConfig.chapterCount }, (_, i) => ({
            number: i + 1,
            title: `CAP ${i + 1} — Analisi ${clientName}`,
            focus_instructions: `Analizza il settore ${sector} per ${clientName}. Usa i dati del ledger.`,
            required_data_points: ['market_data', 'competitor_matrix'],
            target_word_count: tierConfig.wordsPerChapter,
            ledger_sections: ['all'] as ChapterSpec['ledger_sections'],
          }));
        }

        // Guarantee HANDOFF_OPERATIVO as last chapter
        chapterSpecs = enforceHandoffOperativo(chapterSpecs, 500);

        send('chapter_index', { chapters: chapterSpecs, tier });
        send('cost_update', costTracker.snapshot());
        send('status', {
          phase: 'ghostwriter',
          message: `✍️ Ghostwriter: scrittura ${chapterSpecs.length} capitoli in batch di 4...`,
          step: 'ghostwriter_start',
        });

        const chapterStartTimes: Record<number, number> = {};

        // Write chapters in parallel batches
        const chapterTexts = await writeChaptersBatched(
          chapterSpecs,
          ledger,
          coherenceModel,
          {
            onChapterStart: (spec) => {
              chapterStartTimes[spec.number] = Date.now();
              send('chapter_start', { number: spec.number, title: spec.title });
              send('status', {
                phase: 'ghostwriter',
                message: `✍️ Scrivendo: CAP ${spec.number} — ${spec.title.slice(0, 50)}`,
                step: 'writing',
              });
            },
            onChapterComplete: (spec, text) => {
              const durationMs = Date.now() - (chapterStartTimes[spec.number] ?? Date.now());
              const wordCount = text.split(/\s+/).filter(Boolean).length;
              send('chapter_complete', {
                number: spec.number,
                title: spec.title,
                text,
                wordCount,
                durationMs,
              });
              // Legacy events for compatibility
              send('chapter', { chapter: spec.title, number: spec.number });
              send('chunk', { text: `## ${spec.title}\n\n${text}\n\n` });
              const costSnap = costTracker.snapshot();
              send('cost_update', costSnap);
            },
            onChapterError: (spec, error) => {
              send('warning', {
                message: `⚠️ Cap ${spec.number} fallito: ${error}`,
                code: 'CHAPTER_ERROR',
              });
            },
          }
        );

        // Assemble full text
        let fullText = chapterTexts
          .map((text, idx) => {
            const spec = chapterSpecs[idx];
            if (!spec) return text;
            return `## ${spec.title}\n\n${text}`;
          })
          .join('\n\n---\n\n');

        // Healing if needed
        if (!fullText.includes('HANDOFF_OPERATIVO') && !fullText.includes('handoff_operativo')) {
          send('warning', { message: '⚠️ HANDOFF_OPERATIVO non trovato — healing...', code: 'MISSING_HANDOFF' });
          fullText = await healResponse(fullText, 'handoff_operativo', coherenceModel);
        }

        const { data: handoffOperativo } = parseHandoffOperativo(fullText);
        const wordCount = fullText.split(/\s+/).length;
        const chaptersFound = chapterTexts.filter((t) => t && !t.startsWith('[Capitolo non generato')).length;
        const contextBridge = extractContextBridge(fullText);

        const finalCost = costTracker.snapshot();
        send('cost_update', finalCost);
        send('complete', {
          fullText,
          contextBridge,
          handoffOperativo,
          wordCount,
          chaptersFound,
          toolCallsUsed: 0,
          workersCompleted: completedWorkers,
          factsGathered: ledger.verified_facts.length,
          competitorsFound: ledger.competitor_matrix.length,
          contradictionsResolved: ledger.contradictions_log.length,
          cost: finalCost,
          tier,
          chapterSpecs,
        });

      } catch (err) {
        console.error('[orchestrator] SSE error:', err);
        send('error', {
          message: err instanceof Error ? err.message : 'Errore sconosciuto',
          code: 'ORCHESTRATOR_ERROR',
        });
      } finally {
        clearInterval(keepalive);
        controller.close();
      }
    },
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

function buildContextSlice(clientSnapshot: string, handoffData1: string, questionnaire?: string): string {
  const parts = [
    `=== CLIENT SNAPSHOT ===\n${clientSnapshot.slice(0, 3000)}`,
    `=== BLUEPRINT STRATEGICO ===\n${handoffData1.slice(0, 3000)}`,
  ];
  if (questionnaire) parts.push(`=== QUESTIONARIO ===\n${questionnaire.slice(0, 1500)}`);
  return parts.join('\n\n');
}
