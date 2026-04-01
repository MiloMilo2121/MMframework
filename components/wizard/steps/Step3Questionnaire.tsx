'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, MessageSquare, Loader2 } from 'lucide-react';

interface Props {
  onNext: (questionnaire: string, materials?: string, transcriptIntel?: unknown) => void;
}

const TRANSCRIPT_PATTERNS = [
  /\[INTERVISTATORE\]/i,
  /\[FOUNDER\]/i,
  /\[CLIENTE\]/i,
  /^Q:\s/m,
  /^R:\s/m,
  /^Domanda:/m,
  /^Risposta:/m,
  /^INTERVISTATORE:/m,
  /^FOUNDER:/m,
];

function detectTranscript(text: string): boolean {
  return TRANSCRIPT_PATTERNS.some((p) => p.test(text));
}

export function Step3Questionnaire({ onNext }: Props) {
  const [questionnaire, setQuestionnaire] = useState('');
  const [materials, setMaterials] = useState('');
  const [error, setError] = useState('');
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isTranscript = detectTranscript(questionnaire);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        setQuestionnaire((prev) => prev + (prev ? '\n\n' : '') + text);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!questionnaire.trim()) {
      setError('Incolla o carica il questionario compilato per procedere.');
      return;
    }

    if (isTranscript) {
      setIsProcessingTranscript(true);
      try {
        const res = await fetch('/api/transcript-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: questionnaire }),
        });
        const data = await res.json();
        onNext(questionnaire, materials || undefined, data.transcriptIntel);
      } catch {
        // If preprocessing fails, proceed without transcript intel
        onNext(questionnaire, materials || undefined);
      } finally {
        setIsProcessingTranscript(false);
      }
    } else {
      onNext(questionnaire, materials || undefined);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--accent-deepest)' }}>
          Questionario Cliente
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Incolla il questionario compilato o la trascrizione della conversazione con il founder.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Questionario / Trascrizione *</label>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {questionnaire.length.toLocaleString()} caratteri
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="gap-1"
            >
              <Upload className="w-3 h-3" />
              Carica file
            </Button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,.doc,.docx"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Textarea
          value={questionnaire}
          onChange={(e) => { setQuestionnaire(e.target.value); setError(''); }}
          placeholder="Incolla qui il questionario compilato dal cliente oppure la trascrizione della conversazione...

Formato questionario:
- Nome azienda: Ferramenta Rossi Srl
- Settore: Ferramenta e utensileria
...

Formato trascrizione (rilevato automaticamente):
[INTERVISTATORE]: Quali sono i tuoi clienti principali?
[FOUNDER]: Lavoriamo principalmente con artigiani locali...
oppure: Q: ... / R: ..."
          rows={14}
          className="font-mono text-sm"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {isTranscript && (
        <div
          className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: '#F0FDF4',
            borderColor: '#86EFAC',
            color: '#166534',
          }}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Trascrizione conversazione rilevata</strong> — Verr&agrave; preprocessata automaticamente per estrarre insight strategici dal founder prima dell&apos;analisi.
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <label className="text-sm font-medium">Materiali aggiuntivi (opzionale)</label>
        </div>
        <Textarea
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
          placeholder="Link utili, note aggiuntive, listino prezzi, dati GA4, CRM..."
          rows={3}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!questionnaire.trim() || isProcessingTranscript}
        className="w-full text-white"
        style={{ backgroundColor: 'var(--accent-deepest)' }}
      >
        {isProcessingTranscript ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Elaborazione trascrizione...
          </span>
        ) : (
          'Elabora questionario →'
        )}
      </Button>
    </div>
  );
}
