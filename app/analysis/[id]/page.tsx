'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ReportCover } from '@/components/report/ReportCover';
import { RoadmapTimeline } from '@/components/report/RoadmapTimeline';
import { TestPlan } from '@/components/report/TestPlan';
import { HandoffJsonViewer } from '@/components/report/HandoffJsonViewer';
import { MicroSegmentTable } from '@/components/report/MicroSegmentTable';
import { ChapterNavSidebar } from '@/components/report/ChapterNavSidebar';
import { ChapterSection } from '@/components/report/ChapterSection';
import { CompetitorMatrix } from '@/components/report/CompetitorMatrix';
import { VerifiedFactsGrid } from '@/components/report/VerifiedFactsGrid';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import { parseReport } from '@/lib/parsers/parse-report';
import { Button } from '@/components/ui/button';
import { Download, Printer, Copy, FileJson, Loader2, Search } from 'lucide-react';
import type { ParsedReport } from '@/lib/types/report';
import type { CompetitorEntry, VerifiedFact } from '@/lib/types/research-ledger';

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getById, setActive } = useAnalysisStore();
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const mainRef = useRef<HTMLDivElement>(null);

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

  type ChapterItem = { number: number; title: string; text: string; wordCount?: number };
  const chapterItems = useMemo<ChapterItem[]>(() => {
    if (analysis?.chapters && Object.keys(analysis.chapters).length > 0) {
      return Object.entries(analysis.chapters)
        .map(([k, v]) => ({ number: parseInt(k, 10), title: v.title, text: v.text, wordCount: v.wordCount }))
        .filter((c) => c.text && c.text.length > 0)
        .sort((a, b) => a.number - b.number);
    }
    if (report?.chapters && report.chapters.length > 0) {
      return report.chapters.map((ch, i) => ({
        number: i + 1,
        title: ch.title || `Capitolo ${i + 1}`,
        text: ch.content || '',
        wordCount: ch.content ? ch.content.split(/\s+/).length : 0,
      }));
    }
    return [];
  }, [analysis?.chapters, report]);

  const searchedChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chapterItems;
    return chapterItems.filter((c) =>
      c.title.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)
    );
  }, [chapterItems, searchQuery]);

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
      router.push(`/analysis/${params.id}/export`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopyMarkdown = async () => {
    const text = [analysis.reportPart1, analysis.reportPart2, analysis.conclusions]
      .filter(Boolean).join('\n\n---\n\n');
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

  const scrollToChapter = (number: number) => {
    setActiveChapter(number);
    const el = document.getElementById(`cap-${number}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };


  // Collect competitor data from analysis store
  const competitorMatrix: CompetitorEntry[] = [];
  const verifiedFacts: VerifiedFact[] = [];
  // Extract from chapter texts (the ledger is not persisted to store, use handoff data as fallback)

  const hasReport = !!(analysis.reportPart1 || analysis.reportPart2 || chapterItems.length > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main ref={mainRef} className="flex-1 overflow-y-auto min-w-0">
          {/* Top toolbar */}
          <div
            className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b bg-white"
            style={{ borderColor: 'var(--border-brand)' }}
          >
            <div className="min-w-0">
              <h1 className="font-bold truncate" style={{ color: 'var(--accent-deepest)' }}>
                {analysis.clientName}
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {analysis.sector}
                {analysis.status === 'complete' && chapterItems.length > 0
                  ? ` · ${chapterItems.length} capitoli · ${(analysis.metadata?.wordCount || 0).toLocaleString()} parole`
                  : ` · ${analysis.status}`}
                {analysis.cost && ` · $${analysis.cost.totalUsd.toFixed(3)}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleCopyMarkdown} disabled={!hasReport} className="gap-1 text-xs">
                <Copy className="w-3 h-3" />
                {copied ? 'Copiato!' : 'MD'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJson} disabled={!analysis.handoffOperativo} className="gap-1 text-xs">
                <FileJson className="w-3 h-3" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 text-xs">
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
                {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                {pdfLoading ? 'Generando...' : 'PDF'}
              </Button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-8">
            <ReportCover
              clientName={analysis.clientName}
              sector={analysis.sector}
              geography={analysis.geography}
              date={analysis.createdAt}
            />

            {hasReport && chapterItems.length > 0 ? (
              <div className="mt-8 flex gap-6">
                {/* Sticky sidebar nav */}
                <div
                  className="hidden lg:flex flex-col sticky top-20 self-start rounded-xl border overflow-hidden"
                  style={{
                    width: 220,
                    minWidth: 220,
                    maxHeight: 'calc(100vh - 120px)',
                    borderColor: 'var(--border-brand)',
                    backgroundColor: 'white',
                  }}
                >
                  <div
                    className="px-3 pt-3 pb-2 border-b text-xs font-semibold"
                    style={{ borderColor: 'var(--border-brand)', color: 'var(--text-secondary)' }}
                  >
                    {chapterItems.length} capitoli
                  </div>
                  <ChapterNavSidebar
                    chapters={chapterItems}
                    activeNumber={activeChapter}
                    onSelect={scrollToChapter}
                  />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      placeholder="Cerca nel report..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1"
                      style={{ borderColor: 'var(--border-brand)', color: 'var(--text-primary)' }}
                    />
                    {searchQuery && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {searchedChapters.length} risultati
                      </span>
                    )}
                  </div>

                  {/* Chapters */}
                  {searchedChapters.map((ch, i) => (
                    <ChapterSection
                      key={ch.number}
                      number={ch.number}
                      title={ch.title}
                      text={ch.text}
                      wordCount={ch.wordCount}
                      defaultOpen={i < 3}
                    />
                  ))}

                  {searchedChapters.length === 0 && searchQuery && (
                    <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                      <p className="text-sm">Nessun capitolo corrisponde a &ldquo;{searchQuery}&rdquo;</p>
                      <button onClick={() => setSearchQuery('')} className="text-xs mt-2 underline" style={{ color: 'var(--accent-primary)' }}>
                        Rimuovi filtro
                      </button>
                    </div>
                  )}

                  {/* Competitor Matrix */}
                  {competitorMatrix.length > 0 && (
                    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border-brand)' }}>
                      <h3 className="font-bold mb-4" style={{ color: 'var(--accent-deepest)' }}>
                        Competitor Matrix
                      </h3>
                      <CompetitorMatrix competitors={competitorMatrix} />
                    </div>
                  )}

                  {/* Verified Facts */}
                  {verifiedFacts.length > 0 && (
                    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border-brand)' }}>
                      <h3 className="font-bold mb-4" style={{ color: 'var(--accent-deepest)' }}>
                        Fatti Verificati ({verifiedFacts.length})
                      </h3>
                      <VerifiedFactsGrid facts={verifiedFacts} />
                    </div>
                  )}

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
                    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border-brand)' }}>
                      <h3 className="font-bold mb-4" style={{ color: 'var(--accent-deepest)' }}>Micro-Segmentazione</h3>
                      <MicroSegmentTable segments={analysis.handoffOperativo.micro_segments} />
                    </div>
                  )}

                  {/* Conclusions */}
                  {analysis.conclusions && (
                    <div
                      id="cap-conclusions"
                      className="rounded-xl border p-6"
                      style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--surface)' }}
                    >
                      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-deepest)' }}>
                        Conclusioni e Raccomandazioni
                      </h2>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: analysis.conclusions,
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
                className="text-center py-16 rounded-xl border mt-8"
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
                  <Button onClick={() => router.push('/analysis/new')}>Nuova Analisi</Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
