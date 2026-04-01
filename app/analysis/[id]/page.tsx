'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ReportCover } from '@/components/report/ReportCover';
import { ReportIndex } from '@/components/report/ReportIndex';
import { ExecutiveSummary } from '@/components/report/ExecutiveSummary';
import { ChapterBlock } from '@/components/report/ChapterBlock';
import { RoadmapTimeline } from '@/components/report/RoadmapTimeline';
import { TestPlan } from '@/components/report/TestPlan';
import { HandoffJsonViewer } from '@/components/report/HandoffJsonViewer';
import { MicroSegmentTable } from '@/components/report/MicroSegmentTable';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import { parseReport } from '@/lib/parsers/parse-report';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Download, Printer, Copy, FileJson, Loader2 } from 'lucide-react';
import type { ParsedReport } from '@/lib/types/report';

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getById, setActive } = useAnalysisStore();
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const analysis = getById(params.id);

  useEffect(() => {
    if (params.id) setActive(params.id);
  }, [params.id, setActive]);

  useEffect(() => {
    if (analysis?.reportPart1 || analysis?.reportPart2) {
      const parsed = parseReport(
        analysis.reportPart1 || '',
        analysis.reportPart2 || '',
        analysis.conclusions || ''
      );
      setReport(parsed);
    }
  }, [analysis]);

  if (!analysis) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Analisi non trovata</p>
            <Button onClick={() => router.push('/')}>Torna alla dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    if (!analysis) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AnalisiMercato_${analysis.clientName.replace(/\s+/g, '_')}_MarcoMilanello.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to legacy export page
      router.push(`/analysis/${params.id}/export`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopyMarkdown = async () => {
    const text = [analysis.reportPart1, analysis.reportPart2, analysis.conclusions]
      .filter(Boolean)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    if (!analysis.handoffOperativo) return;
    const blob = new Blob([JSON.stringify(analysis.handoffOperativo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HANDOFF_OPERATIVO_${analysis.clientName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasReport = !!(analysis.reportPart1 || analysis.reportPart2);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          {/* Export toolbar */}
          <div
            className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b bg-white"
            style={{ borderColor: 'var(--border-brand)' }}
          >
            <div>
              <h1 className="font-bold" style={{ color: 'var(--accent-deepest)' }}>
                {analysis.clientName}
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {analysis.sector}
                {analysis.status === 'complete'
                  ? ` • ${report?.chapters.length || 0} capitoli`
                  : ` • ${analysis.status}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
                disabled={!hasReport}
                className="gap-1 text-xs"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copiato!' : 'Copia MD'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                disabled={!analysis.handoffOperativo}
                className="gap-1 text-xs"
              >
                <FileJson className="w-3 h-3" />
                Esporta JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1 text-xs"
              >
                <Printer className="w-3 h-3" />
                Stampa
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={!hasReport || pdfLoading}
                className="gap-1 text-xs text-white"
                style={{ backgroundColor: 'var(--accent-deepest)' }}
              >
                {pdfLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {pdfLoading ? 'Generando...' : 'Scarica PDF'}
              </Button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            {/* Cover */}
            <ReportCover
              clientName={analysis.clientName}
              sector={analysis.sector}
              geography={analysis.geography}
              date={analysis.createdAt}
            />

            {/* Index + content layout */}
            {hasReport && report ? (
              <div className="grid grid-cols-[220px_1fr] gap-6">
                {/* Sticky index */}
                <div className="sticky top-20 self-start">
                  <ReportIndex
                    chapters={report.chapters}
                    hasExecutiveSummary={!!report.executiveSummary}
                    hasRoadmap={!!report.roadmap}
                    hasConclusions={!!report.conclusions}
                  />
                </div>

                {/* Report body */}
                <div className="space-y-8 min-w-0">
                  {/* Executive Summary */}
                  {(report.executiveSummary || analysis.handoffOperativo) && (
                    <ExecutiveSummary
                      rawText={report.executiveSummary}
                      handoffOperativo={analysis.handoffOperativo}
                    />
                  )}

                  {/* Chapters */}
                  {report.chapters.map((chapter) => (
                    <ChapterBlock key={chapter.id} section={chapter} />
                  ))}

                  {/* Roadmap */}
                  {analysis.handoffOperativo?.roadmap && (
                    <RoadmapTimeline
                      h1_30d={analysis.handoffOperativo.roadmap.h1_30d}
                      h1_60d={analysis.handoffOperativo.roadmap.h1_60d}
                      h2_90d={analysis.handoffOperativo.roadmap.h2_90d}
                    />
                  )}

                  {/* Test Plan */}
                  {analysis.handoffOperativo?.immediate_tests && (
                    <TestPlan tests={analysis.handoffOperativo.immediate_tests} />
                  )}

                  {/* Micro Segments */}
                  {analysis.handoffOperativo?.micro_segments && (
                    <div>
                      <h3 className="font-bold mb-4" style={{ color: 'var(--accent-deepest)' }}>
                        Micro-Segmentazione
                      </h3>
                      <MicroSegmentTable segments={analysis.handoffOperativo.micro_segments} />
                    </div>
                  )}

                  {/* Conclusions */}
                  {analysis.conclusions && (
                    <div
                      id="conclusions"
                      data-section-id="conclusions"
                      className="rounded-xl border p-6"
                      style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--surface)' }}
                    >
                      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-deepest)' }}>
                        Conclusioni e Raccomandazioni
                      </h2>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(analysis.conclusions, { breaks: true }) as string,
                        }}
                      />
                    </div>
                  )}

                  {/* HANDOFF JSON Viewer */}
                  {analysis.handoffOperativo && (
                    <HandoffJsonViewer
                      handoff={analysis.handoffOperativo}
                      clientName={analysis.clientName}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div
                className="text-center py-16 rounded-xl border"
                style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
              >
                <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {analysis.status === 'complete'
                    ? 'Report completo ma contenuto non disponibile'
                    : analysis.status === 'error'
                    ? `Errore: ${analysis.errorMessage}`
                    : 'Analisi in corso...'}
                </p>
                {analysis.status !== 'complete' && analysis.status !== 'error' && (
                  <Button onClick={() => router.push('/analysis/new')}>
                    Nuova Analisi
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
