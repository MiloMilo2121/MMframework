'use client';

import { Zap, Target, Rocket, Crown, Check } from 'lucide-react';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import { Button } from '@/components/ui/button';

interface Props {
  analysisId: string;
  onNext: () => void;
}

const TIERS = [
  {
    tier: 1 as const,
    icon: Zap,
    name: 'Core Intelligence',
    subtitle: 'Essential · ~40 pag',
    chapters: 20,
    words: '~15.000',
    time: '~3 min',
    cost: '~$3',
    color: '#6B7280',
    recommended: false as boolean,
    features: [
      'Panoramica mercato + competitor top 5',
      'Buyer persona + canali principali',
      'SWOT operativa + piano 30 giorni',
      'HANDOFF_OPERATIVO JSON',
    ],
  },
  {
    tier: 2 as const,
    icon: Target,
    name: 'Advanced Market Map',
    subtitle: 'Recommended · ~60 pag',
    chapters: 28,
    words: '~22.000',
    time: '~6 min',
    cost: '~$8',
    color: 'var(--accent-primary)',
    features: [
      'Tutto di Core + analisi domanda reale',
      'Pricing e modelli di revenue dettagliati',
      'Stack tecnologico + casi studio',
      'Piano operativo 30/60/90 giorni',
    ],
    recommended: true as boolean,
  },
  {
    tier: 3 as const,
    icon: Rocket,
    name: 'Deep-Dive War Room',
    subtitle: 'Professional · ~80 pag',
    chapters: 36,
    words: '~32.000',
    time: '~10 min',
    cost: '~$16',
    color: '#8B5CF6',
    recommended: false as boolean,
    features: [
      'Tutto di Advanced + analisi prodotto/servizio',
      'Funnel AARRR con benchmark settore',
      'Customer care + retention strategies',
      'Micro-segmentazione avanzata',
    ],
  },
  {
    tier: 4 as const,
    icon: Crown,
    name: 'The Monolith',
    subtitle: 'Enterprise · 100+ pag',
    chapters: 45,
    words: '~43.000',
    time: '~18 min',
    cost: '~$30',
    color: '#F59E0B',
    recommended: false as boolean,
    features: [
      'Analisi completa McKinsey-grade',
      'Blue Ocean + Ansoff + Porter dettagliati',
      'JTBD + emotional/social job mapping',
      'Roadmap strategica full year',
    ],
  },
] as const;

export function Step4BisTierSelector({ analysisId, onNext }: Props) {
  const { getById, setEffortTier } = useAnalysisStore();
  const analysis = getById(analysisId);
  const selected = analysis?.effortTier ?? 2;

  const handleSelect = (tier: 1 | 2 | 3 | 4) => {
    setEffortTier(analysisId, tier);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--accent-deepest)' }}>
          Seleziona il livello di analisi
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Più capitoli = analisi più profonda, costo e tempo maggiori. Puoi sempre passare a un tier superiore per la prossima analisi.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {TIERS.map((t) => {
          const Icon = t.icon;
          const isSelected = selected === t.tier;

          return (
            <button
              key={t.tier}
              onClick={() => handleSelect(t.tier)}
              className="relative text-left rounded-xl border-2 p-4 transition-all duration-200 focus:outline-none"
              style={{
                borderColor: isSelected ? t.color : 'var(--border-brand)',
                backgroundColor: isSelected ? (t.color + '12') : 'white',
                boxShadow: isSelected ? `0 0 0 1px ${t.color}40, 0 4px 12px ${t.color}20` : undefined,
              }}
            >
              {t.recommended && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: t.color }}
                >
                  Consigliato
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: t.color + '20', color: t.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: t.color }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              <div className="mb-2">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {t.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {t.subtitle}
                </p>
              </div>

              <div className="flex gap-3 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-mono">{t.chapters} cap</span>
                <span>{t.words} parole</span>
              </div>

              <ul className="space-y-1.5 mb-3">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mt-0.5 shrink-0" style={{ color: t.color }}>•</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-brand)' }}>
                <span className="text-xs font-semibold" style={{ color: t.color }}>{t.cost}</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.time}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          className="text-white px-8"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          Avvia Deep Research →
        </Button>
      </div>
    </div>
  );
}
