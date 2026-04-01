'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalysisStore } from '@/lib/store/analysis-store';

const SECTORS = [
  'Artigianato & Manifattura',
  'Consulenza & Servizi Professionali',
  'E-commerce & Retail',
  'Edilizia & Impiantistica',
  'Formazione & Coaching',
  'Healthcare & Wellness',
  'Ho.Re.Ca. (Hotel/Ristoranti/Catering)',
  'Immobiliare',
  'IT & Software',
  'Marketing & Comunicazione',
  'Moda & Lusso',
  'Produzione Industriale',
  'Tecnologia & Startup',
  'Trasporti & Logistica',
  'Altro',
];

const GEOGRAPHIES = [
  'Italia — Nord',
  'Italia — Centro',
  'Italia — Sud & Isole',
  'Italia — Nazionale',
  'Europa',
  'Internazionale',
];

interface Props {
  onNext: (analysisId: string) => void;
}

export function Step1ClientData({ onNext }: Props) {
  const { createAnalysis } = useAnalysisStore();
  const [form, setForm] = useState({
    clientName: '',
    clientUrl: '',
    sector: '',
    geography: '',
    businessType: '' as 'b2b' | 'b2c' | 'mixed' | '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.clientName.trim()) e.clientName = 'Nome cliente richiesto';
    if (!form.clientUrl.trim()) e.clientUrl = 'URL sito web richiesto';
    if (!form.sector) e.sector = 'Seleziona un settore';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const id = createAnalysis({
      clientName: form.clientName,
      clientUrl: form.clientUrl,
      sector: form.sector,
      geography: form.geography || undefined,
      businessType: form.businessType || undefined,
      notes: form.notes || undefined,
    });

    onNext(id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--accent-deepest)' }}>
          Dati Cliente
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Inserisci le informazioni di base per avviare lo scouting automatico.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Nome Cliente *</label>
          <Input
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            placeholder="Es. Ferramenta Rossi Srl"
          />
          {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">URL Sito Web *</label>
          <Input
            value={form.clientUrl}
            onChange={(e) => setForm({ ...form, clientUrl: e.target.value })}
            placeholder="https://www.esempio.it"
            type="url"
          />
          {errors.clientUrl && <p className="text-xs text-red-500 mt-1">{errors.clientUrl}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Settore *</label>
            <Select value={form.sector || ''} onValueChange={(v) => setForm({ ...form, sector: v ?? '' })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona settore" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => <SelectItem key={s} value={s || '_empty'}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.sector && <p className="text-xs text-red-500 mt-1">{errors.sector}</p>}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Area Geografica</label>
            <Select value={form.geography || ''} onValueChange={(v) => setForm({ ...form, geography: v ?? '' })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona area" />
              </SelectTrigger>
              <SelectContent>
                {GEOGRAPHIES.map((g) => <SelectItem key={g} value={g || '_empty'}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Tipo Business</label>
          <Select value={form.businessType || ''} onValueChange={(v) => setForm({ ...form, businessType: (v ?? '') as typeof form.businessType })}>
            <SelectTrigger>
              <SelectValue placeholder="B2B / B2C / Mixed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="b2b">B2B — Vende ad aziende</SelectItem>
              <SelectItem value="b2c">B2C — Vende a consumatori</SelectItem>
              <SelectItem value="mixed">Mixed — Entrambi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Note aggiuntive</label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Eventuali note o contesto rilevante per lo scouting..."
            rows={3}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full text-white"
        style={{ backgroundColor: 'var(--accent-deepest)' }}
      >
        Avvia scouting →
      </Button>
    </form>
  );
}
