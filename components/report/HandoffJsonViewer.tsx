'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, Eye, Code } from 'lucide-react';
import type { HandoffOperativo } from '@/lib/types/handoff';

interface Props {
  handoff: HandoffOperativo;
  clientName?: string;
}

export function HandoffJsonViewer({ handoff, clientName }: Props) {
  const [view, setView] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(handoff, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HANDOFF_OPERATIVO_${(clientName || 'report').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-brand)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
      >
        <h3 className="font-bold" style={{ color: 'var(--accent-deepest)' }}>
          HANDOFF_OPERATIVO JSON
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView(view === 'formatted' ? 'raw' : 'formatted')}
            className="gap-1 text-xs"
          >
            {view === 'formatted' ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {view === 'formatted' ? 'Raw JSON' : 'Vista umana'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1 text-xs"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copiato!' : 'Copia JSON'}
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            className="gap-1 text-xs text-white"
            style={{ backgroundColor: 'var(--accent-deepest)' }}
          >
            <Download className="w-3 h-3" />
            Scarica JSON
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === 'raw' ? (
        <pre
          className="p-4 text-xs overflow-x-auto leading-relaxed max-h-96 overflow-y-auto"
          style={{ backgroundColor: '#0d1117', color: '#e6edf3', fontFamily: 'monospace' }}
        >
          {jsonString}
        </pre>
      ) : (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Strategic choices */}
          {handoff.strategic_choices && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
                Scelte Strategiche
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(handoff.strategic_choices).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="font-medium text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {k.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-xs truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tests */}
          {handoff.immediate_tests && handoff.immediate_tests.length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
                Test Immediati (ICE-ranked)
              </p>
              <div className="space-y-2">
                {handoff.immediate_tests.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2 rounded-lg text-xs border"
                    style={{ borderColor: 'var(--border-brand)' }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0"
                      style={{ backgroundColor: 'var(--accent-deepest)', color: 'white', fontSize: '10px' }}
                    >
                      {t.priority}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{t.action}</p>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        {t.channel} · {t.kpi} · ICE: {t.ice_score?.total ?? '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ansoff + JTBD summary */}
          <div className="grid grid-cols-2 gap-4">
            {handoff.ansoff_classification && (
              <section>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
                  Strategia Ansoff
                </p>
                <span
                  className="inline-block text-xs px-2 py-1 rounded font-semibold"
                  style={{ backgroundColor: 'var(--fact-badge)', color: 'var(--accent-deepest)' }}
                >
                  {handoff.ansoff_classification.primary_strategy?.replace(/_/g, ' ').toUpperCase()}
                </span>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {handoff.ansoff_classification.rationale}
                </p>
              </section>
            )}
            {handoff.next_phase && (
              <section>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
                  Fase Successiva Consigliata
                </p>
                <span
                  className="inline-block text-xs px-2 py-1 rounded font-semibold"
                  style={{ backgroundColor: 'var(--hypothesis-badge)', color: '#92400E' }}
                >
                  {handoff.next_phase.recommended_service?.replace(/_/g, ' ').toUpperCase()}
                </span>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  ~{handoff.next_phase.estimated_timeline_days}gg
                </p>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
