'use client';

import { marked } from 'marked';
import type { HandoffOperativo } from '@/lib/types/handoff';

interface Props {
  rawText: string;
  handoffOperativo?: HandoffOperativo | null;
}

export function ExecutiveSummary({ rawText, handoffOperativo }: Props) {
  const strategic = handoffOperativo?.strategic_choices;
  const messages = handoffOperativo?.messages?.slice(0, 3) || [];
  const tests = handoffOperativo?.immediate_tests?.slice(0, 3) || [];
  const risks = handoffOperativo?.top_risks?.slice(0, 3) || [];

  // Parse markdown text for fallback display
  const htmlContent = rawText
    ? marked.parse(rawText, { breaks: true }) as string
    : '';

  return (
    <div
      id="executive-summary"
      data-section-id="executive-summary"
      className="rounded-xl border p-6 space-y-6"
      style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--surface)' }}
    >
      <h2 className="text-xl font-bold" style={{ color: 'var(--accent-deepest)' }}>
        Executive Summary
      </h2>

      {strategic ? (
        <div className="space-y-6">
          {/* Key strategic choices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--fact-badge)', borderLeft: '3px solid var(--accent-primary)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent-dark)' }}>
                🎯 Segmento Prioritario
              </p>
              <p className="text-sm font-medium">{strategic.primary_segment || 'In analisi'}</p>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--fact-badge)', borderLeft: '3px solid var(--accent-primary)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent-dark)' }}>
                📢 Canale Primario
              </p>
              <p className="text-sm font-medium">{strategic.primary_channel || 'In analisi'}</p>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--fact-badge)', borderLeft: '3px solid var(--accent-primary)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent-dark)' }}>
                💥 Offerta Consigliata
              </p>
              <p className="text-sm font-medium">{strategic.core_offer || strategic.entry_offer || 'In analisi'}</p>
            </div>
          </div>

          {/* 3 sellable messages */}
          {messages.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                💬 3 Messaggi Vendibili
              </p>
              <div className="space-y-2">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border-brand)', backgroundColor: 'white' }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--accent-deepest)', color: 'white' }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{msg.message}</p>
                      {msg.promise && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Promessa: {msg.promise}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 immediate tests */}
          {tests.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                🧪 3 Test Immediati
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tests.map((test, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-3"
                    style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}
                  >
                    <p className="text-xs font-semibold mb-1 text-green-700">
                      Test {test.priority} — ICE: {test.ice_score?.total ?? '—'}
                    </p>
                    <p className="text-xs">{test.action}</p>
                    <p className="text-xs mt-1 font-medium text-green-700">
                      KPI: {test.kpi}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      ✓ {test.success_threshold}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 main risks */}
          {risks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                ⚠️ 3 Rischi Principali
              </p>
              <div className="space-y-2">
                {risks.map((risk, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{ borderColor: '#FEE2E2', backgroundColor: '#FFF7F7' }}
                  >
                    <span
                      className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: risk.impact === 'high' ? '#EF4444' : risk.impact === 'medium' ? '#F59E0B' : '#6B7280',
                        color: 'white',
                      }}
                    >
                      {risk.impact?.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm">{risk.risk}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Segnale: {risk.early_signal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Fallback: render raw markdown
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      )}
    </div>
  );
}
