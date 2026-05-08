'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StreamingText } from '@/components/streaming/StreamingText';
import { StreamingProgress, type WorkerStatus } from '@/components/streaming/StreamingProgress';
import { ChapterProgressGrid } from '@/components/streaming/ChapterProgressGrid';
import { CostMeter } from '@/components/streaming/CostMeter';
import { LiveReportPreview } from '@/components/streaming/LiveReportPreview';
import { AgentDialogViewer } from '@/components/streaming/AgentDialogViewer';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import type { HandoffOperativo } from '@/lib/types/handoff';
import type { CostSnapshot } from '@/lib/types/analysis';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';
import type { CritiqueRound, Severity, StrategyThesis } from '@/lib/agents/types';
import { SEVERITY_RANK } from '@/lib/agents/types';
import type { CoherenceReport, InnovationScore } from '@/lib/agents/quality-pass';
import { TIER_CAP_USD_MAP } from '@/lib/ai/cost-tracker-client';
import { SSE_EVENT } from '@/lib/ai/sse-events';
import type { ChapterStatus } from '@/lib/ui/status';

interface Props {
  analysisId: string;
}

type PhaseStatus = 'pending' | 'active' | 'complete' | 'error';

const WORKER_LABELS: Record<string, string> = {
  market_dynamics:         'Market Dynamics',
  competitor_intelligence: 'Competitor War-Room',
  product_tech:            'Product & Tech',
  economics_pricing:       'Economics & Pricing',
  swoc_synthesis:          'Challenger QA',
};

const INITIAL_WORKERS: WorkerStatus[] = [
  { id: 'market_dynamics',         label: 'Market Dynamics',      status: 'pending' },
  { id: 'competitor_intelligence', label: 'Competitor War-Room',  status: 'pending' },
  { id: 'product_tech',            label: 'Product & Tech',       status: 'pending' },
  { id: 'economics_pricing',       label: 'Economics & Pricing', status: 'pending' },
  { id: 'swoc_synthesis',          label: 'Challenger QA',        status: 'pending' },
];

export function Step5Research({ analysisId }: Props) {
  const router = useRouter();
  const {
    getById, updateStatus, setReportPart1, setReportPart2, setConclusions,
    updateAnalysis, setChapterSpecs, upsertChapter, setCost,
    appendCritiqueRound, setStrategyThesis, setSelectedFrameworkIds,
    setCoherenceReport, setInnovationScore,
  } = useAnalysisStore();
  const analysis = getById(analysisId);
  const effortTier = analysis?.effortTier ?? 2;

  const [orchestratorStatus, setOrchestratorStatus] = useState<PhaseStatus>('active');
  const [orchestratorProgress, setOrchestratorProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState('Avvio Pentathlon...');
  const [log, setLog] = useState<Array<{ ts: string; message: string; type?: string }>>([]);
  const [isDone, setIsDone] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [workers, setWorkers] = useState<WorkerStatus[]>(INITIAL_WORKERS);
  const startTimeRef = useRef(Date.now());
  const completedWorkersRef = useRef(0);

  // Derive chapter view state from store (single source of truth)
  const chapterSpecs = useMemo(() => analysis?.chapterSpecs ?? [], [analysis?.chapterSpecs]);
  const chaptersFromStore = useMemo(() => analysis?.chapters ?? {}, [analysis?.chapters]);
  const critiqueRoundsByChapter = useMemo(() => analysis?.chapterCritiqueRounds ?? {}, [analysis?.chapterCritiqueRounds]);
  const cost = analysis?.cost ?? null;
  const roundsMap = useMemo(() => {
    const out: Record<number, number> = {};
    for (const [num, rounds] of Object.entries(critiqueRoundsByChapter)) {
      out[Number(num)] = rounds.length;
    }
    return out;
  }, [critiqueRoundsByChapter]);
  const severityMap = useMemo(() => {
    const out: Record<number, Severity> = {};
    for (const [num, rounds] of Object.entries(critiqueRoundsByChapter)) {
      let max: Severity = 'none';
      for (const r of rounds) {
        for (const c of r.critiques) {
          if (SEVERITY_RANK[c.severity] > SEVERITY_RANK[max]) max = c.severity;
        }
      }
      out[Number(num)] = max;
    }
    return out;
  }, [critiqueRoundsByChapter]);
  const chapterTitlesMap = useMemo(() => {
    const out: Record<number, string> = {};
    for (const spec of chapterSpecs) out[spec.number] = spec.title;
    return out;
  }, [chapterSpecs]);
  const hasCritiqueData = Object.keys(critiqueRoundsByChapter).length > 0;
  const coherenceReport = analysis?.coherenceReport;
  const innovationScore = analysis?.innovationScore;
  const statusMap = useMemo(() => {
    const map: Record<number, ChapterStatus> = {};
    for (const spec of chapterSpecs) {
      map[spec.number] = chaptersFromStore[spec.number]?.status ?? 'pending';
    }
    return map;
  }, [chapterSpecs, chaptersFromStore]);

  const addLog = useCallback((message: string, type?: string) => {
    const ts = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog((prev) => [...prev.slice(-80), { ts, message, type }]);
  }, []);

  const updateWorker = useCallback((workerId: string, update: Partial<WorkerStatus>) => {
    setWorkers((prev) => prev.map((w) => w.id === workerId ? { ...w, ...update } : w));
  }, []);

  const handleChapter = useCallback((chapter: string) => {
    setCurrentChapter(chapter);
    const match = chapter.match(/(\d+)/);
    if (match) {
      setOrchestratorProgress(Math.min(95, 40 + parseInt(match[1], 10) * 2));
    }
  }, []);

  const handleStatus = useCallback((msg: string, data?: Record<string, unknown>) => {
    addLog(msg);
    if (data?.workerId && typeof data.workerId === 'string') {
      updateWorker(data.workerId, {
        status: data.status as WorkerStatus['status'],
        toolCalls: typeof data.toolCalls === 'number' ? data.toolCalls : undefined,
      });
    }
  }, [addLog, updateWorker]);

  const handleComplete = useCallback(async (data: Record<string, unknown>) => {
    const fullText = typeof data.fullText === 'string' ? data.fullText : '';
    const handoffOperativo = data.handoffOperativo as HandoffOperativo | null;
    const wordCount = typeof data.wordCount === 'number' ? data.wordCount : 0;
    const chaptersFound = typeof data.chaptersFound === 'number' ? data.chaptersFound : 0;
    const costData = data.cost as CostSnapshot | undefined;
    const specs = Array.isArray(data.chapterSpecs) ? data.chapterSpecs as ChapterSpec[] : [];

    const midpoint = Math.floor(fullText.length / 2);
    setReportPart1(analysisId, fullText.slice(0, midpoint), '');
    setReportPart2(analysisId, fullText.slice(midpoint), handoffOperativo);

    if (costData) setCost(analysisId, costData);
    if (specs.length > 0) setChapterSpecs(analysisId, specs);

    setOrchestratorProgress(100);
    setOrchestratorStatus('complete');
    addLog(`✅ ${wordCount.toLocaleString()} parole, ${chaptersFound} capitoli`);

    updateAnalysis(analysisId, {
      metadata: {
        totalTokens: costData?.tokens ?? 0,
        generationTimeMs: Date.now() - startTimeRef.current,
        chaptersFound,
        wordCount,
      },
    });

    addLog('⚡ Generazione conclusioni...');
    const currentAnalysis = getById(analysisId);
    try {
      const res = await fetch('/api/step3-conclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: currentAnalysis?.clientName || '',
          sector: currentAnalysis?.sector || '',
          reportPart1: fullText.slice(0, 4000),
          reportPart2: fullText.slice(-4000),
          handoffOperativo: handoffOperativo ? JSON.stringify(handoffOperativo).slice(0, 2000) : '',
        }),
      });
      if (res.ok) {
        const { conclusions } = (await res.json()) as { conclusions: string };
        setConclusions(analysisId, conclusions);
        addLog('✅ Conclusioni generate.');
      }
    } catch (err) {
      addLog(`Conclusioni: ${err instanceof Error ? err.message : 'errore'}`, 'warning');
    }

    setIsDone(true);
    setIsRunning(false);
    updateStatus(analysisId, 'complete');
  }, [analysisId, setReportPart1, setReportPart2, setConclusions, updateStatus, updateAnalysis, addLog, getById, setCost, setChapterSpecs]);

  const handleError = useCallback((msg: string) => {
    addLog(`Errore: ${msg}`, 'error');
    setOrchestratorStatus('error');
    updateStatus(analysisId, 'error', msg);
    setIsRunning(false);
  }, [addLog, analysisId, updateStatus]);

  // SSE event dispatch table — typo-proof via SSE_EVENT constants
  const eventHandlers = useMemo(() => ({
    [SSE_EVENT.MODULE_STATUS]: (data: Record<string, unknown>) => {
      const wId = String(data.workerId || '');
      const wStatus = data.status as WorkerStatus['status'];
      if (!wId || !wStatus) return;
      updateWorker(wId, { status: wStatus, toolCalls: typeof data.toolCalls === 'number' ? data.toolCalls : undefined });
      const label = WORKER_LABELS[wId] || wId;
      if (wStatus === 'complete') {
        completedWorkersRef.current++;
        addLog(`✓ ${label} — ${data.toolCalls || 0} ricerche`);
      } else if (wStatus === 'running') {
        addLog(`⚡ ${label} avviato`);
      } else if (wStatus === 'error') {
        addLog(`✗ ${label}: ${String(data.message || 'errore')}`, 'error');
      }
      setOrchestratorProgress(Math.min(35, completedWorkersRef.current * 7));
    },

    [SSE_EVENT.CHAPTER_INDEX]: (data: Record<string, unknown>) => {
      const specs = Array.isArray(data.chapters) ? data.chapters as ChapterSpec[] : [];
      setChapterSpecs(analysisId, specs);
      for (const s of specs) upsertChapter(analysisId, s.number, { status: 'pending', title: s.title });
      addLog(`📋 ${specs.length} capitoli pianificati`);
    },

    [SSE_EVENT.CHAPTER_START]: (data: Record<string, unknown>) => {
      const num = typeof data.number === 'number' ? data.number : 0;
      const title = typeof data.title === 'string' ? data.title : '';
      upsertChapter(analysisId, num, { status: 'writing', title });
      setCurrentChapter(`CAP ${num} — ${title.slice(0, 40)}`);
    },

    [SSE_EVENT.CHAPTER_COMPLETE]: (data: Record<string, unknown>) => {
      const num = typeof data.number === 'number' ? data.number : 0;
      const title = typeof data.title === 'string' ? data.title : '';
      const text = typeof data.text === 'string' ? data.text : '';
      const wordCount = typeof data.wordCount === 'number' ? data.wordCount : 0;
      upsertChapter(analysisId, num, { status: 'done', title, text, wordCount });
    },

    [SSE_EVENT.COST_UPDATE]: (data: Record<string, unknown>) => {
      setCost(analysisId, data as unknown as CostSnapshot);
    },

    [SSE_EVENT.COST_EXCEEDED]: (data: Record<string, unknown>) => {
      addLog(`⛔ Budget superato: $${(data.totalUsd as number).toFixed(3)} / $${data.capUsd} — generazione interrotta`, 'warning');
    },

    // Boardroom events
    [SSE_EVENT.RAG_LOOKUP_COMPLETE]: (data: Record<string, unknown>) => {
      const frameworks = Array.isArray(data.selectedFrameworks)
        ? (data.selectedFrameworks as Array<{ id: string; name: string }>)
        : [];
      setSelectedFrameworkIds(analysisId, frameworks.map((f) => f.id));
      addLog(`📚 ${frameworks.length} framework selezionati`);
    },

    [SSE_EVENT.STRATEGY_THESIS_READY]: (data: Record<string, unknown>) => {
      const thesis: StrategyThesis = {
        central_thesis: String(data.thesis ?? ''),
        narrative_angle: String(data.angle ?? ''),
        positioning_statement: String(data.positioning ?? ''),
        selected_frameworks: Array.isArray(data.selectedFrameworks) ? (data.selectedFrameworks as string[]) : [],
        contrarian_insights: Array.isArray(data.contrarianInsights) ? (data.contrarianInsights as string[]) : [],
        must_address: [],
        must_avoid: [],
      };
      setStrategyThesis(analysisId, thesis);
      addLog(`🎯 Tesi: ${thesis.central_thesis.slice(0, 80)}...`);
    },

    [SSE_EVENT.OUTLINE_READY]: (data: Record<string, unknown>) => {
      const num = typeof data.chapter === 'number' ? data.chapter : 0;
      addLog(`📋 Outline CAP ${num} pronto (${data.subPointsCount ?? '?'} sub-points)`);
    },

    [SSE_EVENT.WRITER_DRAFT_READY]: (data: Record<string, unknown>) => {
      const num = typeof data.chapter === 'number' ? data.chapter : 0;
      const iter = typeof data.iteration === 'number' ? data.iteration : 1;
      const wc = typeof data.wordCount === 'number' ? data.wordCount : 0;
      setCurrentChapter(`CAP ${num} draft v${iter} (${wc} parole)`);
    },

    [SSE_EVENT.CHAIR_VERDICT]: (data: Record<string, unknown>) => {
      const num = typeof data.chapter === 'number' ? data.chapter : 0;
      const decision = String(data.decision ?? '');
      const sev = String(data.severity ?? '');
      const cnt = typeof data.critiqueCount === 'number' ? data.critiqueCount : 0;
      addLog(`⚖️ CAP ${num} round ${data.iteration}: ${decision} (${sev}, ${cnt} critiche)`);
    },

    [SSE_EVENT.REVISION_REQUESTED]: (data: Record<string, unknown>) => {
      const num = typeof data.chapter === 'number' ? data.chapter : 0;
      const fix = typeof data.mustFixCount === 'number' ? data.mustFixCount : 0;
      addLog(`🔁 CAP ${num} revisione richiesta (${fix} must-fix)`);
    },

    [SSE_EVENT.CHAPTER_PROMOTED]: (data: Record<string, unknown>) => {
      const num = typeof data.chapter === 'number' ? data.chapter : 0;
      const iter = typeof data.finalIteration === 'number' ? data.finalIteration : 1;
      const forced = Boolean(data.forcedPromote);
      addLog(`✅ CAP ${num} promosso (${iter} round${iter === 1 ? '' : 's'}${forced ? ', forced' : ''})`);
    },

    [SSE_EVENT.AGENT_DIALOG]: (data: Record<string, unknown>) => {
      const num = typeof data.chapter === 'number' ? data.chapter : 0;
      const rounds = Array.isArray(data.rounds) ? (data.rounds as CritiqueRound[]) : [];
      for (const round of rounds) {
        appendCritiqueRound(analysisId, num, round);
      }
    },

    [SSE_EVENT.COHERENCE_REPORT]: (data: Record<string, unknown>) => {
      const report = data as unknown as CoherenceReport;
      setCoherenceReport(analysisId, report);
      addLog(`🔍 Wow score: ${report.wow_score}/10 — ${report.thesis_consistency}`);
    },

    [SSE_EVENT.INNOVATION_SCORE]: (data: Record<string, unknown>) => {
      const score = data as unknown as InnovationScore;
      setInnovationScore(analysisId, score);
      addLog(`✨ Innovation score: ${score.composite_score.toFixed(1)}/10`);
    },
  }), [analysisId, addLog, setChapterSpecs, upsertChapter, setCost, updateWorker, appendCritiqueRound, setStrategyThesis, setSelectedFrameworkIds, setCoherenceReport, setInnovationScore]);

  const handleRawEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    eventHandlers[eventType as keyof typeof eventHandlers]?.(data);
  }, [eventHandlers]);

  const orchestratorBody = useMemo(() => ({
    clientSnapshot: JSON.stringify(analysis?.clientSnapshot || {}),
    handoffData1: JSON.stringify(analysis?.handoffData1 || {}),
    questionnaire: analysis?.questionnaire,
    analysisId,
    effort_tier: effortTier,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [analysisId]);

  const capUsd = TIER_CAP_USD_MAP[effortTier as 1 | 2 | 3 | 4] ?? 10;
  const estimatedSecondsLeft = Math.max(0, 240 - Math.floor((Date.now() - startTimeRef.current) / 1000));

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--accent-deepest)' }}>
            Deep Research — Tier {effortTier}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {analysis?.clientName} · {analysis?.sector}
          </p>
        </div>
        {isRunning && (
          <Badge
            className="animate-pulse text-xs"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-deepest)' }}
          >
            ● {currentChapter.slice(0, 45)}
          </Badge>
        )}
      </div>

      {cost && isRunning && <CostMeter cost={cost} capUsd={capUsd} />}

      {(coherenceReport || innovationScore) && (
        <div
          className="rounded-lg border p-3 flex flex-wrap items-center gap-4 text-sm"
          style={{ borderColor: 'var(--border-brand)', backgroundColor: 'white' }}
        >
          {coherenceReport && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Wow score</span>
              <span
                className="text-lg font-bold"
                style={{ color: coherenceReport.wow_score >= 7 ? '#16A34A' : coherenceReport.wow_score >= 5 ? '#F59E0B' : '#DC2626' }}
              >
                {coherenceReport.wow_score}/10
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                · {coherenceReport.thesis_consistency} · {coherenceReport.contradictions.length} contraddizioni
              </span>
            </div>
          )}
          {innovationScore && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Innovation</span>
              <span
                className="text-lg font-bold"
                style={{ color: innovationScore.composite_score >= 7 ? '#16A34A' : innovationScore.composite_score >= 5 ? '#F59E0B' : '#DC2626' }}
              >
                {innovationScore.composite_score.toFixed(1)}/10
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                · {Math.round(innovationScore.counter_intuitive_density * 100)}% controintuitivo · {innovationScore.unique_source_domains} domini
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <StreamingProgress
            phases={[{
              label: 'Analisi Multi-Modello',
              description: '5 Worker + Architect + Ghostwriter',
              progress: orchestratorProgress,
              status: orchestratorStatus,
            }]}
            currentChapter={currentChapter}
            log={log}
            estimatedSecondsLeft={estimatedSecondsLeft}
            workers={workers}
          />

          {chapterSpecs.length > 0 && (
            <ChapterProgressGrid
              chapterSpecs={chapterSpecs}
              statusMap={statusMap}
              roundsMap={roundsMap}
              severityMap={severityMap}
              onCellClick={(num) => document.getElementById(`live-cap-${num}`)?.scrollIntoView({ behavior: 'smooth' })}
            />
          )}

          {hasCritiqueData && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                Dialogo agenti
              </p>
              <AgentDialogViewer rounds={critiqueRoundsByChapter} chapterTitles={chapterTitlesMap} />
            </div>
          )}

          <div className="hidden">
            <StreamingText
              url="/api/step2-research/orchestrator"
              body={orchestratorBody}
              onChapter={handleChapter}
              onComplete={handleComplete}
              onError={handleError}
              onStatus={handleStatus}
              onWarning={(msg) => addLog(msg, 'warning')}
              onRawEvent={handleRawEvent}
              autoStart={true}
            />
          </div>
        </div>

        <div className="h-[600px] lg:sticky lg:top-24">
          <LiveReportPreview chapters={chaptersFromStore} />
        </div>
      </div>

      {isDone && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => router.push(`/analysis/${analysisId}`)}
            className="text-white px-8 py-3 text-base"
            style={{ backgroundColor: 'var(--accent-deepest)' }}
          >
            Vedi report completo →
          </Button>
        </div>
      )}
    </div>
  );
}
