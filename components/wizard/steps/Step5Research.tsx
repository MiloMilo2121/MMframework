'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StreamingText } from '@/components/streaming/StreamingText';
import { StreamingProgress, type WorkerStatus } from '@/components/streaming/StreamingProgress';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import type { HandoffOperativo } from '@/lib/types/handoff';
import type { AnalysisVectorConfig } from '@/lib/types/analysis';

const DEFAULT_VECTOR: AnalysisVectorConfig = {
  effort_tier: 2,
  target_audience: { role: 'Titolare', age_bracket: '40-60', tech_literacy: 'medium', cynicism_level: 'standard' },
  strategic_modifiers: { international_context: false, include_ma_targets: false, include_blue_ocean: false },
};

interface Props {
  analysisId: string;
  vectorConfig?: AnalysisVectorConfig;
}

type PhaseStatus = 'pending' | 'active' | 'complete' | 'error';

const WORKER_LABELS: Record<string, string> = {
  market_dynamics: 'Market Dynamics',
  competitor_intelligence: 'Competitor War-Room',
  product_tech: 'Product & Tech',
  economics_pricing: 'Economics & Pricing',
  swoc_synthesis: 'Challenger QA',
};

export function Step5Research({ analysisId, vectorConfig = DEFAULT_VECTOR }: Props) {
  const router = useRouter();
  const { getById, updateStatus, setReportPart1, setReportPart2, setConclusions, updateAnalysis } = useAnalysisStore();
  const analysis = getById(analysisId);

  const [orchestratorStatus, setOrchestratorStatus] = useState<PhaseStatus>('active');
  const [orchestratorProgress, setOrchestratorProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState('Avvio Pentathlon...');
  const [log, setLog] = useState<Array<{ ts: string; message: string; type?: string }>>([]);
  const [isDone, setIsDone] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [workers, setWorkers] = useState<WorkerStatus[]>([
    { id: 'market_dynamics', label: 'Market Dynamics', status: 'pending' },
    { id: 'competitor_intelligence', label: 'Competitor War-Room', status: 'pending' },
    { id: 'product_tech', label: 'Product & Tech', status: 'pending' },
    { id: 'economics_pricing', label: 'Economics & Pricing', status: 'pending' },
    { id: 'swoc_synthesis', label: 'Challenger QA', status: 'pending' },
  ]);
  const startTimeRef = useRef(Date.now());

  const addLog = useCallback((message: string, type?: string) => {
    const ts = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog((prev) => [...prev.slice(-60), { ts, message, type }]);
  }, []);

  const updateWorker = useCallback((workerId: string, update: Partial<WorkerStatus>) => {
    setWorkers((prev) => prev.map((w) =>
      w.id === workerId ? { ...w, ...update } : w
    ));
  }, []);

  const handleChapter = useCallback((chapter: string) => {
    setCurrentChapter(chapter);
    addLog(`📄 ${chapter}`);
    // Estimate progress: support both legacy "CAP X" and new "X.Y" hierarchical format
    const hierarchicalMatch = chapter.match(/^(\d+)\.(\d+)/);
    const legacyMatch = chapter.match(/CAP\s+(\d+)/);
    if (hierarchicalMatch) {
      const section = parseInt(hierarchicalMatch[1], 10);
      const sub = parseInt(hierarchicalMatch[2], 10);
      // Rough progress: distribute 55% of bar across sections (from 40% to 95%)
      setOrchestratorProgress(Math.min(95, 40 + section * 8 + sub));
    } else if (legacyMatch) {
      const capNum = parseInt(legacyMatch[1], 10);
      setOrchestratorProgress(Math.min(95, 40 + capNum * 4));
    }
  }, [addLog]);

  const handleStatus = useCallback((msg: string, data?: Record<string, unknown>) => {
    addLog(msg);

    // Handle module_status events embedded in status
    if (data?.workerId && typeof data.workerId === 'string') {
      const wId = data.workerId as string;
      const wStatus = data.status as WorkerStatus['status'];
      updateWorker(wId, {
        status: wStatus,
        toolCalls: typeof data.toolCalls === 'number' ? data.toolCalls : undefined,
      });
    }
  }, [addLog, updateWorker]);

  const handleWarning = useCallback((msg: string) => {
    addLog(msg, 'warning');
  }, [addLog]);

  const handleComplete = useCallback(async (data: Record<string, unknown>) => {
    const fullText = typeof data.fullText === 'string' ? data.fullText : '';
    const handoffOperativo = data.handoffOperativo as HandoffOperativo | null;
    const wordCount = typeof data.wordCount === 'number' ? data.wordCount : 0;
    const chaptersFound = typeof data.chaptersFound === 'number' ? data.chaptersFound : 0;
    const workersCompleted = typeof data.workersCompleted === 'number' ? data.workersCompleted : 0;
    const factsGathered = typeof data.factsGathered === 'number' ? data.factsGathered : 0;
    const competitorsFound = typeof data.competitorsFound === 'number' ? data.competitorsFound : 0;

    // Store as Part 1 + Part 2 (the full text goes into Part 1 for compatibility)
    const midpoint = Math.floor(fullText.length / 2);
    const part1 = fullText.slice(0, midpoint);
    const part2 = fullText.slice(midpoint);

    setReportPart1(analysisId, part1, '');
    setReportPart2(analysisId, part2, handoffOperativo);
    setOrchestratorProgress(100);
    setOrchestratorStatus('complete');

    addLog(`✅ Report completato — ${wordCount.toLocaleString()} parole, ${chaptersFound} capitoli`);
    addLog(`📊 ${workersCompleted}/4 Worker | ${factsGathered} fatti | ${competitorsFound} competitor`);

    updateAnalysis(analysisId, {
      metadata: {
        totalTokens: 0,
        generationTimeMs: Date.now() - startTimeRef.current,
        chaptersFound,
        wordCount,
      },
    });

    // Step 3: generate conclusions
    addLog('⚡ Generazione conclusioni...');
    const currentAnalysis = getById(analysisId);
    try {
      const res = await fetch('/api/step3-conclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: currentAnalysis?.clientName || '',
          sector: currentAnalysis?.sector || '',
          reportPart1: part1.slice(0, 4000),
          reportPart2: part2.slice(0, 4000),
          handoffOperativo: handoffOperativo ? JSON.stringify(handoffOperativo).slice(0, 2000) : '',
        }),
      });
      if (res.ok) {
        const { conclusions } = (await res.json()) as { conclusions: string };
        setConclusions(analysisId, conclusions);
        addLog('✅ Conclusioni generate.');
      }
    } catch (err) {
      addLog(`Errore conclusioni: ${err instanceof Error ? err.message : 'unknown'}`, 'warning');
    }

    setIsDone(true);
    setIsRunning(false);
    updateStatus(analysisId, 'complete');
  }, [analysisId, setReportPart1, setReportPart2, setConclusions, updateStatus, updateAnalysis, addLog, getById]);

  const handleError = useCallback((msg: string) => {
    addLog(`Errore: ${msg}`, 'error');
    setOrchestratorStatus('error');
    updateStatus(analysisId, 'error', msg);
    setIsRunning(false);
  }, [addLog, analysisId, updateStatus]);

  // Custom SSE handler to intercept module_status events
  const handleRawEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    if (eventType === 'module_status') {
      const wId = String(data.workerId || '');
      const wStatus = data.status as WorkerStatus['status'];
      if (wId && wStatus) {
        updateWorker(wId, {
          status: wStatus,
          toolCalls: typeof data.toolCalls === 'number' ? data.toolCalls : undefined,
        });
        const label = WORKER_LABELS[wId] || wId;
        if (wStatus === 'complete') addLog(`✓ ${label} — ${data.toolCalls || 0} ricerche`);
        if (wStatus === 'running') addLog(`⚡ ${label} avviato`);
        if (wStatus === 'error') addLog(`✗ ${label}: ${data.message || 'errore'}`, 'error');
      }
      // Update progress during workers phase
      const completedCount = workers.filter((w) => w.status === 'complete').length;
      setOrchestratorProgress(Math.min(35, completedCount * 7));
    }
  }, [updateWorker, addLog, workers]);

  const orchestratorBody = {
    clientSnapshot: JSON.stringify(analysis?.clientSnapshot || {}),
    handoffData1: JSON.stringify(analysis?.handoffData1 || {}),
    questionnaire: analysis?.questionnaire,
    analysisId,
    vectorConfig,
  };

  const elapsedMs = Date.now() - startTimeRef.current;
  const estimatedLeft = Math.max(0, 240000 - elapsedMs) / 1000;

  return (
    <div className="space-y-4 max-w-3xl w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--accent-deepest)' }}>
            Deep Research — Pentathlon
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {analysis?.clientName} • {analysis?.sector}
          </p>
        </div>
        {isRunning && (
          <Badge
            className="animate-pulse"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-deepest)' }}
          >
            ● {currentChapter.slice(0, 40)}
          </Badge>
        )}
      </div>

      {/* Progress */}
      <StreamingProgress
        phases={[
          {
            label: 'Analisi Multi-Modello (5 Worker + CoherenceGate)',
            description: '5 specialisti in parallelo + editor strategico',
            progress: orchestratorProgress,
            status: orchestratorStatus,
          },
        ]}
        currentChapter={currentChapter}
        log={log}
        estimatedSecondsLeft={estimatedLeft}
        workers={workers}
      />

      {/* Streaming viewer */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{ height: 400, borderColor: '#30363d' }}
      >
        <StreamingText
          url="/api/step2-research/orchestrator"
          body={orchestratorBody}
          onChapter={handleChapter}
          onComplete={handleComplete}
          onError={handleError}
          onStatus={handleStatus}
          onWarning={handleWarning}
          onRawEvent={handleRawEvent}
          autoStart={true}
        />
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
