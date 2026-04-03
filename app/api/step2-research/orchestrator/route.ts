/**
 * Orchestrator — the Pentathlon Smart-Router for Step 2 Deep Research.
 *
 * Phase A: Build ResearchLedger from client context
 * Phase B: Promise.allSettled — 4 Miner Workers in parallel + 1 Challenger
 * Phase C: Architect → hierarchical DocumentPlan
 * Phase D: Ghostwriter loop — one callOpenRouter per sub-chapter (Telaio Ricorsivo)
 * Phase E: Isolated HANDOFF_OPERATIVO extraction (Sonnet, Zod-protected)
 *
 * Model routing (blindato):
 *   Miners  → MODEL_TIERS.MINER     (deepseek-chat)  — extraction only
 *   Architect → MODEL_TIERS.ARCHITECT (deepseek-r1)   — index planning only
 *   Ghostwriter → coherenceModel    (claude-sonnet)   — prose writing only
 */
import { NextRequest } from 'next/server';
import { callOpenRouter, MODEL_TIERS } from '@/lib/ai/openrouter';
import { runWorker } from '@/lib/ai/workers';
import {
  createEmptyLedger,
  mergeLedger,
  filterLedgerByFocus,
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
import { COHERENCE_GATE_SYSTEM } from '@/lib/ai/prompts/step2-coherence';
import { generateHierarchicalIndex } from '@/lib/ai/architect';
import {
  buildDynamicTone,
  buildSubChapterPrompt,
  summarizeForNextChapter,
  buildHandoffExtractionPrompt,
} from '@/lib/ai/ghostwriter';
import { parseHandoffOperativo } from '@/lib/parsers/parse-handoff';
import { extractContextBridge } from '@/lib/parsers/parse-report';
import type { AnalysisVectorConfig } from '@/lib/types/analysis';

export const maxDuration = 300;

const DEFAULT_VECTOR_CONFIG: AnalysisVectorConfig = {
  effort_tier: 2,
  target_audience: {
    role: 'Titolare',
    age_bracket: '40-60',
    tech_literacy: 'medium',
    cynicism_level: 'standard',
  },
  strategic_modifiers: {
    international_context: false,
    include_ma_targets: false,
    include_blue_ocean: false,
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    clientSnapshot: string;
    handoffData1: string;
    questionnaire?: string;
    materials?: string;
    analysisId?: string;
    vectorConfig?: AnalysisVectorConfig;
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
        // Tier 1 — Miners: cheap extraction model, never writes prose
        const minerModel = MODEL_TIERS.MINER;
        // Tier 3 — Ghostwriter: only model that writes the final report
        const coherenceModel = process.env.GHOSTWRITER_MODEL || process.env.COHERENCE_MODEL || 'anthropic/claude-sonnet-4-5';
        // Config vector — defaults to tier 2 / standard if not provided (backward-compatible)
        const vectorConfig: AnalysisVectorConfig = body.vectorConfig || DEFAULT_VECTOR_CONFIG;

        // ── Phase A: Build initial ledger ─────────────────────────────────────
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

        // ── Phase B: Run 4 Miners in parallel ────────────────────────────────
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

        // ── Phase B.5: Challenger cross-validation ────────────────────────────
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

        // ── Phase C: Architect generates hierarchical DocumentPlan ─────────────
        send('status', { phase: 'architect', message: '🏛️ Architetto genera indice gerarchico...', step: 'architect' });

        // Compact ledger summary for Architect (keeps its prompt small)
        const ledgerSummary = JSON.stringify({
          facts_count: ledger.verified_facts.length,
          market_points: ledger.market_data.length,
          competitors_found: ledger.competitor_matrix.map((c) => c.name),
          top_facts: ledger.verified_facts.slice(0, 8),
          top_market_data: ledger.market_data.slice(0, 6),
          contradictions: ledger.contradictions_log.length,
        }, null, 2);

        const documentPlan = await generateHierarchicalIndex(ledgerSummary, vectorConfig, clientName, sector);
        const totalSubs = documentPlan.macro_sections.reduce((acc: number, s) => acc + s.sub_chapters.length, 0);

        send('status', {
          phase: 'architect',
          message: `📋 Piano: ${documentPlan.macro_sections.length} sezioni, ${totalSubs} sub-capitoli`,
          step: 'plan_ready',
        });

        // ── Phase D: Ghostwriter loop — Telaio Ricorsivo ──────────────────────
        send('status', {
          phase: 'coherence',
          message: `🧠 Avvio Ghostwriter con ${coherenceModel}... (${ledger.verified_facts.length} fatti, ${ledger.competitor_matrix.length} competitor)`,
          step: 'coherence_start',
        });

        const toneInstructions = buildDynamicTone(vectorConfig.target_audience);
        let finalReportMarkdown = '';
        let rollingSummary = '';
        let subChaptersWritten = 0;

        for (const section of documentPlan.macro_sections) {
          const sectionHeader = `# ${section.section_number}. ${section.section_title}\n\n`;
          finalReportMarkdown += sectionHeader;
          send('chunk', { text: sectionHeader });

          for (const sub of section.sub_chapters) {
            send('status', {
              phase: 'drafting',
              message: `✍️ Scrivendo: ${sub.sub_number} ${sub.title}`,
              step: 'writing',
            });

            // Ledger Slicer — surgical context for this sub-chapter only
            const surgicalLedger = filterLedgerByFocus(ledger, sub.required_data_focus);
            // Cap context to ~18k chars to stay well within Ghostwriter's window
            const contextJson = JSON.stringify(surgicalLedger, null, 2).slice(0, 18_000);

            try {
              const subText = await callOpenRouter({
                model: coherenceModel,
                systemPrompt: COHERENCE_GATE_SYSTEM,
                maxTokens: Math.min(Math.round(sub.target_words * 5.5), 4096),
                temperature: 0.4,
                frequency_penalty: 0.35,
                messages: [{
                  role: 'user',
                  content: buildSubChapterPrompt({
                    subChapter: sub,
                    section,
                    clientName,
                    sector,
                    toneInstructions,
                    rollingSummary,
                    contextJson,
                  }),
                }],
              });

              const subHeader = `## ${sub.sub_number} ${sub.title}\n\n`;
              const subBlock = subHeader + subText + '\n\n';
              finalReportMarkdown += subBlock;
              send('chunk', { text: subBlock });
              send('chapter', { chapter: `${sub.sub_number} ${sub.title}` });

              subChaptersWritten++;

              // Rolling summary via MINER (cheap, sequential — coherence requires order)
              rollingSummary = await summarizeForNextChapter(subText);
            } catch (subErr) {
              const errMsg = subErr instanceof Error ? subErr.message : 'errore sconosciuto';
              console.error(`[orchestrator] Sub-chapter ${sub.sub_number} failed:`, errMsg);
              const placeholder = `## ${sub.sub_number} ${sub.title}\n\n[Sezione non disponibile — ${errMsg}]\n\n`;
              finalReportMarkdown += placeholder;
              send('chunk', { text: placeholder });
              send('warning', { message: `⚠️ ${sub.sub_number} fallito: ${errMsg}`, code: 'SUB_CHAPTER_ERROR' });
            }
          }
        }

        // ── Phase E: Isolated HANDOFF_OPERATIVO extraction ────────────────────
        send('status', { phase: 'handoff', message: '📦 Estrazione HANDOFF_OPERATIVO...', step: 'handoff' });

        let handoffRawText = '';
        try {
          handoffRawText = await callOpenRouter({
            model: coherenceModel,
            maxTokens: 6000,
            temperature: 0.1,
            messages: [{
              role: 'user',
              content: buildHandoffExtractionPrompt(finalReportMarkdown, clientName, sector),
            }],
          });
        } catch (err) {
          console.error('[orchestrator] Handoff extraction failed:', err);
          send('warning', { message: '⚠️ Estrazione HANDOFF_OPERATIVO fallita', code: 'MISSING_HANDOFF' });
        }

        const { data: handoffOperativo } = parseHandoffOperativo(handoffRawText || finalReportMarkdown);
        const wordCount = finalReportMarkdown.split(/\s+/).length;
        const chaptersFound = (finalReportMarkdown.match(/^## \d+\.\d+/gm) || []).length;
        const contextBridge = extractContextBridge(finalReportMarkdown);

        send('complete', {
          fullText: finalReportMarkdown,
          contextBridge,
          handoffOperativo,
          wordCount,
          chaptersFound,
          toolCallsUsed: 0,
          workersCompleted: completedWorkers,
          factsGathered: ledger.verified_facts.length,
          competitorsFound: ledger.competitor_matrix.length,
          contradictionsResolved: ledger.contradictions_log.length,
          subChaptersWritten,
          totalSubChapters: totalSubs,
          documentStructure: {
            sections: documentPlan.macro_sections.length,
            effort_tier: vectorConfig.effort_tier,
          },
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
