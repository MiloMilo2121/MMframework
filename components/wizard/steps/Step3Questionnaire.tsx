'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onNext: (questionnaire: string, materials?: string) => void;
}

export function Step3Questionnaire({ onNext }: Props) {
  const [questionnaire, setQuestionnaire] = useState('');
  const [materials, setMaterials] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = () => {
    if (!questionnaire.trim()) {
      setError('Incolla o carica il questionario compilato per procedere.');
      return;
    }
    onNext(questionnaire, materials || undefined);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--accent-deepest)' }}>
          Questionario Cliente
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Incolla il questionario compilato dal cliente. Verrà trasformato in un briefing strutturato.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Questionario compilato *</label>
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
          placeholder="Incolla qui il questionario compilato dal cliente...

Esempio:
- Nome azienda: Ferramenta Rossi Srl
- Settore: Ferramenta e utensileria
- Clienti attuali: Artigiani e privati del territorio
- Obiettivo 90 giorni: Aumentare le vendite online
..."
          rows={14}
          className="font-mono text-sm"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

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
        disabled={!questionnaire.trim()}
        className="w-full text-white"
        style={{ backgroundColor: 'var(--accent-deepest)' }}
      >
        Elabora questionario →
      </Button>
    </div>
  );
}
