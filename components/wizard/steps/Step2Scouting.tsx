'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import type { ClientSnapshot } from '@/lib/types/analysis';

interface Props {
  analysisId: string;
  onNext: () => void;
}

export function Step2Scouting({ analysisId, onNext }: Props) {
  const { getById, updateAnalysis, updateStatus } = useAnalysisStore();
  const analysis = getById(analysisId);

  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [snapshot, setSnapshot] = useState<ClientSnapshot | null>(null);
  const [rawText, setRawText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedRaw, setEditedRaw] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!analysis) return;

    const runScouting = async () => {
      updateStatus(analysisId, 'scouting');
      setState('loading');

      try {
        const res = await fetch('/api/step0-scouting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: analysis.clientName,
            websiteUrl: analysis.clientUrl,
            note: analysis.notes,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { snapshot: ClientSnapshot; rawText: string };

        setSnapshot(data.snapshot);
        setRawText(data.rawText);
        setEditedRaw(data.rawText);

        updateAnalysis(analysisId, {
          clientSnapshot: data.snapshot,
          snapshotRawText: data.rawText,
        });

        setState('done');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Errore scouting';
        setError(msg);
        updateStatus(analysisId, 'error', msg);
        setState('error');
      }
    };

    void runScouting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Analizzando {analysis?.clientName}...
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Scouting web in corso. Attendere 30-60 secondi.
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Errore durante lo scouting</span>
        </div>
        <p className="text-sm">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--accent-deepest)' }}>
          Scouting Completato
        </h2>
      </div>

      {snapshot && !editMode && (
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--surface)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--accent-deepest)' }}>
                {snapshot.client_name}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {snapshot.sector} • {snapshot.subsector}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-deepest)' }}>
                {snapshot.business_model_guess?.toUpperCase()}
              </Badge>
              <Badge variant="outline">{snapshot.type}</Badge>
            </div>
          </div>

          {snapshot.offers.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                Cosa vendono
              </p>
              <ul className="space-y-1">
                {snapshot.offers.map((o, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span style={{ color: 'var(--accent-primary)' }}>▸</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot.positioning_notes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                Posizionamento
              </p>
              <ul className="space-y-1">
                {snapshot.positioning_notes.map((n, i) => (
                  <li key={i} className="text-sm">{n}</li>
                ))}
              </ul>
            </div>
          )}

          {snapshot.open_questions_for_call.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                Domande da fare in call
              </p>
              <ol className="space-y-1 list-decimal list-inside">
                {snapshot.open_questions_for_call.map((q, i) => (
                  <li key={i} className="text-sm">{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {editMode && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Modifica snapshot (testo grezzo)</label>
          <Textarea
            value={editedRaw}
            onChange={(e) => setEditedRaw(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Chiudi editor' : 'Modifica snapshot'}
        </Button>
        <Button
          onClick={onNext}
          className="text-white"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          Continua con questo snapshot →
        </Button>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Raw text: {rawText.length} caratteri
      </p>
    </div>
  );
}
