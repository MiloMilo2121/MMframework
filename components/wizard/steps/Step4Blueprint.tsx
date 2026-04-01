'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import type { HandoffData1 } from '@/lib/types/handoff';

interface Props {
  analysisId: string;
  questionnaire: string;
  materials?: string;
  onNext: () => void;
}

export function Step4Blueprint({ analysisId, questionnaire, materials, onNext }: Props) {
  const { getById, setHandoffData1 } = useAnalysisStore();
  const analysis = getById(analysisId);

  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [handoff, setHandoff] = useState<HandoffData1 | null>(null);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('Leggendo questionario...');

  const steps = [
    'Leggendo questionario...',
    'Identificando target...',
    'Analizzando offerta...',
    'Creando piano di ricerca...',
    'Finalizzando briefing...',
  ];

  useEffect(() => {
    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setStep(steps[stepIdx]);
    }, 3000);

    const run = async () => {
      try {
        const res = await fetch('/api/step1-blueprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionnaire,
            materials,
            clientSnapshot: analysis?.snapshotRawText || JSON.stringify(analysis?.clientSnapshot || {}),
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { handoffData1: HandoffData1; rawText: string; parseError: string | null };

        setHandoff(data.handoffData1);
        setRawText(data.rawText);

        if (data.handoffData1) {
          setHandoffData1(analysisId, data.handoffData1, data.rawText);
        }

        setState('done');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Errore blueprint';
        setError(msg);
        setState('error');
      } finally {
        clearInterval(interval);
      }
    };

    void run();
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 max-w-md mx-auto">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        <p className="font-medium text-center" style={{ color: 'var(--text-primary)' }}>
          Elaborazione Blueprint in corso...
        </p>
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          {step}
        </p>
        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          Richiede 30-90 secondi
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Errore durante il Blueprint</span>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!handoff) {
    return (
      <div className="space-y-4">
        <p>Dati non disponibili. Riprova.</p>
        <Button onClick={onNext}>Salta e continua</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--accent-deepest)' }}>
          Blueprint Completato
        </h2>
      </div>

      {/* Company Profile */}
      <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border-brand)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--accent-dark)' }}>Profilo Azienda</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium">Nome: </span>{handoff.client.name}
          </div>
          <div>
            <span className="font-medium">Location: </span>{handoff.client.location}
          </div>
          <div>
            <span className="font-medium">Modello: </span>
            <Badge variant="outline" className="text-xs">{handoff.client.business_model}</Badge>
          </div>
          <div>
            <span className="font-medium">Bottleneck: </span>
            <span style={{ color: 'var(--text-secondary)' }}>{handoff.client.main_bottleneck}</span>
          </div>
        </div>
        <div>
          <span className="font-medium text-sm">Offerta: </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{handoff.client.offer_summary}</span>
        </div>
      </div>

      {/* USP Candidates */}
      {handoff.usp_candidates.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold" style={{ color: 'var(--accent-dark)' }}>USP Candidate</h3>
          <div className="space-y-2">
            {handoff.usp_candidates.map((usp, i) => (
              <div
                key={i}
                className="rounded-lg border p-3"
                style={{
                  borderColor: usp.proof === 'NON TRACCIATO' ? '#FEE2E2' : 'var(--accent-primary)',
                  backgroundColor: usp.proof === 'NON TRACCIATO' ? '#FFF7F7' : 'var(--surface)',
                }}
              >
                <p className="font-medium text-sm">{usp.usp}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Prova: {usp.proof}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non Tracked Alerts */}
      {handoff.non_tracked.length > 0 && (
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ borderColor: '#FEE2E2', backgroundColor: '#FFF7F7' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-sm text-red-600">
              {handoff.non_tracked.length} dati NON TRACCIATI
            </h3>
          </div>
          {handoff.non_tracked.slice(0, 3).map((nt, i) => (
            <div key={i} className="text-xs">
              <span className="font-medium">{nt.field}</span>
              <span style={{ color: 'var(--text-secondary)' }}> — {nt.risk}</span>
            </div>
          ))}
        </div>
      )}

      {/* Domande di Ricerca */}
      {handoff.research_questions_prioritized.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--accent-dark)' }}>
            Priorità Deep Research ({handoff.research_questions_prioritized.length} domande)
          </h3>
          <ol className="space-y-1 list-decimal list-inside">
            {handoff.research_questions_prioritized.slice(0, 5).map((q, i) => (
              <li key={i} className="text-sm">
                {q.question}
                <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                  → {q.decision_unlocked}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <div className="text-xs self-center" style={{ color: 'var(--text-secondary)' }}>
          {rawText.length.toLocaleString()} caratteri generati
        </div>
        <Button
          onClick={onNext}
          className="ml-auto text-white"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          Avvia Deep Research →
        </Button>
      </div>
    </div>
  );
}
