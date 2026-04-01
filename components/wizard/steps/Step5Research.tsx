'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StreamingText } from '@/components/streaming/StreamingText';
import { StreamingProgress } from '@/components/streaming/StreamingProgress';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import type { HandoffOperativo } from '@/lib/types/handoff';

interface Props {
  analysisId: string;
}

type PhaseStatus = 'pending' | 'active' | 'complete' | 'error';

export function Step5Research({ analysisId }: Props) {
  const router = useRouter();
  const { getById, updateStatus, setReportPart1, setReportPart2, setConclusions, updateAnalysis } = useAnalysisStore();
  const analysis = getById(analysisId);

  const [phase1Status, setPhase1Status] = useState<PhaseStatus>('active');
  const [phase2Status, setPhase2Status] = useState<PhaseStatus>('pending');
  const [phase1Progress, setPhase1Progress] = useState(0);
  const [phase2Progress, setPhase2Progress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState('Avvio...');
  const [log, setLog] = useState<Array<{ ts: string; message: string; type?: string }>>([]);
  const [isDone, setIsDone] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
  const [phase1Text, setPhase1Text] = useState('');
  const [phase2Active, setPhase2Active] = useState(false);
  const contextBridgeRef = useRef('');
  const startTimeRef = useRef(Date.now());

  const addLog = useCallback((message: string, type?: string) => {
    const ts = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog((prev) => [...prev.slice(-50), { ts, message, type }]);
  }, []);

  // Part 1 handlers
  const handlePart1Chapter = useCallback((chapter: string) => {
    setCurrentChapter(chapter);
    addLog(`${chapter}`);
  }, [addLog]);

  const handlePart1Status = useCallback((msg: string) => {
    addLog(msg);
  }, [addLog]);

  const handlePart1Warning = useCallback((msg: string) => {
    addLog(msg, 'warning');
  }, [addLog]);

  const handlePart1Complete = useCallback(async (data: Record<string, unknown>) => {
    const fullText = typeof data.fullText === 'string' ? data.fullText : '';
    const contextBridge = typeof data.contextBridge === 'string' ? data.contextBridge : '';
    const wordCount = typeof data.wordCount === 'number' ? data.wordCount : 0;
    const chaptersFound = typeof data.chaptersFound === 'number' ? data.chaptersFound : 0;

    contextBridgeRef.current = contextBridge;
    setPhase1Text(fullText);
    setReportPart1(analysisId, fullText, contextBridge);
    setPhase1Progress(100);
    setPhase1Status('complete');

    addLog(`Parte 1 completata — ${wordCount.toLocaleString()} parole, ${chaptersFound} capitoli`);

    updateAnalysis(analysisId, {
      metadata: {
        totalTokens: 0,
        generationTimeMs: Date.now() - startTimeRef.current,
        chaptersFound,
        wordCount,
      },
    });

    // Transition to Part 2
    setCurrentPhase(2);
    setPhase2Status('active');
    setCurrentChapter('Avvio Parte 2...');
    setPhase2Active(true);
  }, [analysisId, setReportPart1, updateAnalysis, addLog]);

  const handlePart1Error = useCallback((msg: string) => {
    addLog(`Errore Parte 1: ${msg}`, 'error');
    setPhase1Status('error');
    updateStatus(analysisId, 'error', msg);
    setIsRunning(false);
  }, [addLog, analysisId, updateStatus]);

  // Part 2 handlers
  const handlePart2Chapter = useCallback((chapter: string) => {
    setCurrentChapter(chapter);
    addLog(chapter);
  }, [addLog]);

  const handlePart2Status = useCallback((msg: string) => {
    addLog(msg);
  }, [addLog]);

  const handlePart2Warning = useCallback((msg: string) => {
    addLog(msg, 'warning');
  }, [addLog]);

  const handlePart2Complete = useCallback(async (data: Record<string, unknown>) => {
    const fullText = typeof data.fullText === 'string' ? data.fullText : '';
    const handoffOperativo = data.handoffOperativo as HandoffOperativo | null;
    const wordCount = typeof data.wordCount === 'number' ? data.wordCount : 0;

    setReportPart2(analysisId, fullText, handoffOperativo);
    setPhase2Progress(100);
    setPhase2Status('complete');

    addLog(`Parte 2 completata — ${wordCount.toLocaleString()} parole`);

    // Step 3: generate conclusions
    addLog('Generazione conclusioni...');
    const analysis = getById(analysisId);
    try {
      const res = await fetch('/api/step3-conclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: analysis?.clientName || '',
          sector: analysis?.sector || '',
          reportPart1: analysis?.reportPart1?.slice(0, 4000) || '',
          reportPart2: fullText.slice(0, 4000),
          handoffOperativo: handoffOperativo ? JSON.stringify(handoffOperativo).slice(0, 2000) : '',
        }),
      });
      if (res.ok) {
        const { conclusions } = (await res.json()) as { conclusions: string };
        setConclusions(analysisId, conclusions);
        addLog('Conclusioni generate.');
      }
    } catch (err) {
      addLog(`Errore conclusioni: ${err instanceof Error ? err.message : 'unknown'}`, 'warning');
    }

    setIsDone(true);
    setIsRunning(false);
    updateStatus(analysisId, 'complete');
  }, [analysisId, setReportPart2, setConclusions, updateStatus, addLog, getById]);

  const handlePart2Error = useCallback((msg: string) => {
    addLog(`Errore Parte 2: ${msg}`, 'error');
    setPhase2Status('error');
    updateStatus(analysisId, 'error', msg);
    setIsRunning(false);
  }, [addLog, analysisId, updateStatus]);

  const part1Body = {
    clientSnapshot: JSON.stringify(analysis?.clientSnapshot || {}),
    handoffData1: JSON.stringify(analysis?.handoffData1 || {}),
  };

  const part2Body = {
    contextBridge: contextBridgeRef.current,
    handoffData1: JSON.stringify(analysis?.handoffData1 || {}),
    part1Summary: phase1Text.slice(0, 5000),
  };

  const elapsedMs = Date.now() - startTimeRef.current;
  const estimatedLeft = currentPhase === 1
    ? Math.max(0, 480000 - elapsedMs) / 1000
    : Math.max(0, 360000 - elapsedMs) / 1000;

  return (
    <div className="space-y-4 max-w-3xl w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--accent-deepest)' }}>
            Deep Research
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
            label: 'Executive Summary + Capitoli 1-7',
            description: 'Analisi di mercato, competitor, domanda, pricing, canali, buyer persona',
            progress: phase1Progress,
            status: phase1Status,
          },
          {
            label: 'Capitoli 8-14 + Roadmap + HANDOFF',
            description: 'Leve comm., SWOT, piano operativo, roadmap 30/60/90',
            progress: phase2Progress,
            status: phase2Status,
          },
        ]}
        currentChapter={currentChapter}
        log={log}
        estimatedSecondsLeft={estimatedLeft}
      />

      {/* Streaming viewer */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{ height: 400, borderColor: '#30363d' }}
      >
        {currentPhase === 1 && (
          <StreamingText
            url="/api/step2-research/part1"
            body={part1Body}
            onChapter={handlePart1Chapter}
            onComplete={handlePart1Complete}
            onError={handlePart1Error}
            onStatus={handlePart1Status}
            onWarning={handlePart1Warning}
            autoStart={true}
          />
        )}
        {currentPhase === 2 && (
          <StreamingText
            url="/api/step2-research/part2"
            body={{
              ...part2Body,
              contextBridge: contextBridgeRef.current,
              part1Summary: phase1Text.slice(0, 5000),
            }}
            onChapter={handlePart2Chapter}
            onComplete={handlePart2Complete}
            onError={handlePart2Error}
            onStatus={handlePart2Status}
            onWarning={handlePart2Warning}
            autoStart={phase2Active}
          />
        )}
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
