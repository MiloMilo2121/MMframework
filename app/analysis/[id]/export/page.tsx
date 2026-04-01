'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAnalysisStore } from '@/lib/store/analysis-store';
import { parseReport } from '@/lib/parsers/parse-report';
import { ReportCover } from '@/components/report/ReportCover';
import { ExecutiveSummary } from '@/components/report/ExecutiveSummary';
import { ChapterBlock } from '@/components/report/ChapterBlock';
import { RoadmapTimeline } from '@/components/report/RoadmapTimeline';
import { HandoffJsonViewer } from '@/components/report/HandoffJsonViewer';
import { generatePdf } from '@/lib/export/pdf-generator';
import { marked } from 'marked';

export default function ExportPage() {
  const params = useParams<{ id: string }>();
  const { getById } = useAnalysisStore();
  const analysis = getById(params.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedRef = useRef(false);

  const report = analysis
    ? parseReport(
        analysis.reportPart1 || '',
        analysis.reportPart2 || '',
        analysis.conclusions || ''
      )
    : null;

  useEffect(() => {
    if (!containerRef.current || !analysis || generatedRef.current) return;

    const timer = setTimeout(async () => {
      generatedRef.current = true;
      try {
        await generatePdf(containerRef.current!, analysis.clientName);
      } catch (err) {
        console.error('PDF generation failed:', err);
        window.print();
      }
    }, 1000); // Wait for render

    return () => clearTimeout(timer);
  }, [analysis]);

  if (!analysis || !report) {
    return <div className="p-8">Analisi non trovata.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="max-w-4xl mx-auto bg-white"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* CSS for print */}
      <style>{`
        @media print {
          @page { size: A4; margin: 25mm 20mm; }
          .page-break { page-break-before: always; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <ReportCover
        clientName={analysis.clientName}
        sector={analysis.sector}
        geography={analysis.geography}
        date={analysis.createdAt}
      />

      <div className="page-break" />

      {(report.executiveSummary || analysis.handoffOperativo) && (
        <div className="py-8 px-8">
          <ExecutiveSummary
            rawText={report.executiveSummary}
            handoffOperativo={analysis.handoffOperativo}
          />
        </div>
      )}

      {report.chapters.map((chapter) => (
        <div key={chapter.id} className="page-break px-8 py-8">
          <ChapterBlock section={chapter} />
        </div>
      ))}

      {analysis.handoffOperativo?.roadmap && (
        <div className="page-break px-8 py-8">
          <RoadmapTimeline
            h1_30d={analysis.handoffOperativo.roadmap.h1_30d}
            h1_60d={analysis.handoffOperativo.roadmap.h1_60d}
            h2_90d={analysis.handoffOperativo.roadmap.h2_90d}
          />
        </div>
      )}

      {analysis.conclusions && (
        <div className="page-break px-8 py-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#022226' }}>
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

      {analysis.handoffOperativo && (
        <div className="px-8 py-8">
          <HandoffJsonViewer
            handoff={analysis.handoffOperativo}
            clientName={analysis.clientName}
          />
        </div>
      )}

      {/* Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 text-xs text-center py-2 border-t"
        style={{ color: '#5A7878', borderColor: '#E2EDED' }}
      >
        Confidenziale — Analisi di Mercato elaborata da Axend — Non distribuire
      </div>
    </div>
  );
}
