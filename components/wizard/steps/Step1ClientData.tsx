'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import type { AnalysisVectorConfig } from '@/lib/types/analysis';

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

const EFFORT_TIERS = [
  { value: '1', label: '1 — Essenziale', description: '~12 sub-capitoli, costo minimo' },
  { value: '2', label: '2 — Standard', description: '~22 sub-capitoli, report completo' },
  { value: '3', label: '3 — Avanzato', description: '~32 sub-capitoli, include Copy & Canali' },
  { value: '4', label: '4 — Elite', description: '~48 sub-capitoli, include M&A, Blue Ocean, HR' },
];

interface Props {
  onNext: (analysisId: string, vectorConfig: AnalysisVectorConfig) => void;
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
  const [vector, setVector] = useState({
    effort_tier: '2' as '1' | '2' | '3' | '4',
    role: '',
    age_bracket: '',
    tech_literacy: 'medium' as 'low' | 'medium' | 'high',
    cynicism_level: 'standard' as 'standard' | 'high',
    international_context: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

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

    const vectorConfig: AnalysisVectorConfig = {
      effort_tier: parseInt(vector.effort_tier, 10) as 1 | 2 | 3 | 4,
      target_audience: {
        role: vector.role || 'Titolare',
        age_bracket: vector.age_bracket || '40-60',
        tech_literacy: vector.tech_literacy,
        cynicism_level: vector.cynicism_level,
      },
      strategic_modifiers: {
        international_context: vector.international_context,
        include_ma_targets: vector.effort_tier === '4',
        include_blue_ocean: vector.effort_tier === '4',
      },
    };

    const id = createAnalysis({
      clientName: form.clientName,
      clientUrl: form.clientUrl,
      sector: form.sector,
      geography: form.geography || undefined,
      businessType: form.businessType || undefined,
      notes: form.notes || undefined,
      vectorConfig,
    });

    onNext(id, vectorConfig);
  };

  const selectedTier = EFFORT_TIERS.find((t) => t.value === vector.effort_tier);

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

      {/* ── Base fields ── */}
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

      {/* ── Configuration Vector ── */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-deepest)' }}>
              Configurazione Report
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Controlla profondità, tono e costo dell&apos;analisi
            </p>
          </div>
          <button
            type="button"
            className="text-xs underline"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? 'Nascondi opzioni avanzate' : 'Mostra opzioni avanzate'}
          </button>
        </div>

        {/* Effort tier */}
        <div>
          <label className="text-sm font-medium block mb-1">Profondità Analisi</label>
          <Select
            value={vector.effort_tier}
            onValueChange={(v) => setVector({ ...vector, effort_tier: v as typeof vector.effort_tier })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EFFORT_TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTier && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {selectedTier.description}
            </p>
          )}
        </div>

        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border-brand)' }}>
            {/* Role */}
            <div>
              <label className="text-sm font-medium block mb-1">Profilo Lettore</label>
              <Input
                value={vector.role}
                onChange={(e) => setVector({ ...vector, role: e.target.value })}
                placeholder="Es. Titolare Storico, CTO, Direttore Commerciale"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Adatta il linguaggio e i concetti al lettore reale del report.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tech literacy */}
              <div>
                <label className="text-sm font-medium block mb-1">Competenza Tecnica</label>
                <Select
                  value={vector.tech_literacy}
                  onValueChange={(v) => setVector({ ...vector, tech_literacy: v as typeof vector.tech_literacy })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bassa — niente tecnicismi</SelectItem>
                    <SelectItem value="medium">Media — standard</SelectItem>
                    <SelectItem value="high">Alta — gergo tecnico ok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cynicism */}
              <div>
                <label className="text-sm font-medium block mb-1">Tono</label>
                <Select
                  value={vector.cynicism_level}
                  onValueChange={(v) => setVector({ ...vector, cynicism_level: v as typeof vector.cynicism_level })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard — equilibrato</SelectItem>
                    <SelectItem value="high">Avvocato del Diavolo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* International context */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="intl"
                checked={vector.international_context}
                onChange={(e) => setVector({ ...vector, international_context: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="intl" className="text-sm">
                Contesto Internazionale — forza benchmark EN/DE su Exa
              </label>
            </div>
          </div>
        )}
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
