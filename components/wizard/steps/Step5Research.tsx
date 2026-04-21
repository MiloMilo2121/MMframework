'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StreamingText } from '@/components/streaming/StreamingText';
import { StreamingProgress, type WorkerStatus } from '@/components/streaming/StreamingProgress';
import { ChapterProgressGrid } from '@/components/streaming/ChapterProgressGrid';
import { CostMeter } from '@/components/streaming/CostMeter';
import { LiveReportPreview } from '@/components/streaming/LiveReportPreview';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import type { HandoffOperativo } from '@/lib/types/handoff';
import type { CostSnapshot } from '@/lib/types/analysis';
import type { ChapterSpec } from '@/lib/ai/prompts/architect';
import { TIER_CAP_USD_MAP } from '@/lib/ai/cost-tracker-client';

interface Props {
  analysisId: string;
}

type PhaseStatus = 'pending' | 'active' | 'complete' | 'error';

const WORKER_LABELS: Record<string, string> = {
  market_dynamics:        'Market Dynamics',
  competitor_intelligence:'Competitor War-Room',
  product_tech:           'Product & Tech',
  economics_pricing:      'Economics & Pricing',
  swoc_synthesis:         'Challenger QA',
};

export function Step5Research({ analysisId }: Props) {
  const router = useRouter();
  const {
    getById, updateStatus, setReportPart1, setReportPart2, setConclusions,
    updateAnalysis, setChapterSpecs, upsertChapter, setCost,
  } = useAnalysisStore();
  const analysis = getById(analysisId);
  const effortTier = analysis?.effortTier ?? 2;

  const [orchestratorStatus, setOrchestratorStatus] = useState<PhaseStatus>('active');
  const [orchestratorProgress, setOrchestratorProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState('Avvio Pentathlon...');
  const [log, setLog] = useState<Array<{ ts: string; message: string; type?: string }>>([]);
  const [isDone, setIsDone] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [workers, setWorkers] = useState<WorkerStatus[]>([
    { id: 'market_dynamics',         label: 'Market Dynamics',      status: 'pending' },
    { id: 'competitor_intelligence',  label: 'Competitor War-Room',  status: 'pending' },
    { id: 'product_tech',             label: 'Product & Tech',        status: 'pending' },
    { id: 'economics_pricing',        label: 'Economics & Pricing',  status: 'pending' },
    { id: 'swoc_synthesis',           label: 'Challenger QA',         status: 'pending' },
  ]);
  const [chapterSpecs, setLocalChapterSpecs] = useState<ChapterSpec[]>([]);
  const [chapterStatusMap, setChapterStatusMap] = useState<Record<number, 'pending' | 'writing' | 'done' | 'error'>>({});
  const [cost, setCostLocal] = useState<CostSnapshot | null>(null);
  const startTimeRef = useRef(Date.now());

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
      const capNum = parseInt(match[1], 10);
      setOrchestratorProgress(Math.min(95, 40 + capNum * 2));
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

    if (costData) {
      setCost(analysisId, costData);
      setCostLocal(costData);
    }
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

  const handleRawEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    if (eventType === 'module_status') {
      const wId = String(data.workerId || '');
      const wStatus = data.status as WorkerStatus['status'];
      if (wId && wStatus) {
        updateWorker(wId, { status: wStatus, toolCalls: typeof data.toolCalls === 'number' ? data.toolCalls : undefined });
        const label = WORKER_LABELS[wId] || wId;
        if (wStatus === 'complete') addLog(`✓ ${label} — ${data.toolCalls || 0} ricerche`);
        else if (wStatus === 'running') addLog(`⚡ ${label} avviato`);
        else if (wStatus === 'error') addLog(`✗ ${label}: ${String(data.message || 'errore')}`, 'error');
      }
      const completedCount = workers.filter((w) => w.status === 'complete').length;
      setOrchestratorProgress(Math.min(35, completedCount * 7));
    }

    if (eventType === 'chapter_index') {
      const specs = Array.isArray(data.chapters) ? data.chapters as ChapterSpec[] : [];
      setLocalChapterSpecs(specs);
      setChapterSpecs(analysisId, specs);
      const initial: Record<number, 'pending'> = {};
      specs.forEach((s) => { initial[s.number] = 'pending'; });
      setChapterStatusMap(initial);
      addLog(`📋 ${specs.length} capitoli pianificati`);
    }

    if (eventType === 'chapter_start') {
      const num = typeof data.number === 'number' ? data.number : 0;
      const title = typeof data.title === 'string' ? data.title : '';
      setChapterStatusMap((prev) => ({ ...prev, [num]: 'writing' }));
      upsertChapter(analysisId, num, { status: 'writing', title });
      setCurrentChapter(`CAP ${num} — ${title.slice(0, 40)}`);
    }

    if (eventType === 'chapter_complete') {
      const num = typeof data.number === 'number' ? data.number : 0;
      const title = typeof data.title === 'string' ? data.title : '';
      const text = typeof data.text === 'string' ? data.text : '';
      const wordCount = typeof data.wordCount === 'number' ? data.wordCount : 0;
      setChapterStatusMap((prev) => ({ ...prev, [num]: 'done' }));
      upsertChapter(analysisId, num, { status: 'done', title, text, wordCount });
    }

    if (eventType === 'cost_update') {
      const snap = data as unknown as CostSnapshot;
      setCostLocal(snap);
      setCost(analysisId, snap);
    }
  }, [updateWorker, addLog, workers, analysisId, setChapterSpecs, upsertChapter, setCost]);

  const orchestratorBody = {
    clientSnapshot: JSON.stringify(analysis?.clientSnapshot || {}),
    handoffData1: JSON.stringify(analysis?.handoffData1 || {}),
    questionnaire: analysis?.questionnaire,
    analysisId,
    effort_tier: effortTier,
  };

  const capUsd = TIER_CAP_USD_MAP[effortTier as 1 | 2 | 3 | 4] ?? 10;
  const chaptersFromStore = analysis?.chapters ?? {};

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
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

      {/* Cost meter (fixed corner) */}
      {cost && isRunning && <CostMeter cost={cost} capUsd={capUsd} />}

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* LEFT: progress panel */}
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
            estimatedSecondsLeft={Math.max(0, 240000 - (Date.now() - startTimeRef.current)) / 1000}
            workers={workers}
          />

          {chapterSpecs.length > 0 && (
            <ChapterProgressGrid
              chapterSpecs={chapterSpecs}
              statusMap={chapterStatusMap}
              onCellClick={(num) => {
                const el = document.getElementById(`live-cap-${num}`);
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          )}

          {/* SSE connector (hidden, drives all events) */}
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

        {/* RIGHT: live preview */}
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
