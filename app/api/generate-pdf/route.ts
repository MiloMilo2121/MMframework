/**
 * PDF generation API using @react-pdf/renderer.
 * Client POSTs the analysis data, server streams back a PDF.
 */
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { ReportPdf } from '@/components/pdf/ReportPdf';
import { parseReport } from '@/lib/parsers/parse-report';
import type { Analysis } from '@/lib/types/analysis';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const analysis: Analysis = await req.json();

    if (!analysis?.clientName) {
      return NextResponse.json({ error: 'Dati analisi mancanti.' }, { status: 400 });
    }

    const report = parseReport(
      analysis.reportPart1 || '',
      analysis.reportPart2 || '',
      analysis.conclusions || ''
    );

    const chapters = report.chapters.map((ch) => ({
      id: ch.id,
      number: ch.chapterNumber ?? 0,
      title: ch.title,
      content: ch.content || '',
    }));

    const pdfBuffer = await renderToBuffer(
      React.createElement(ReportPdf, { analysis, chapters }) as React.ReactElement<DocumentProps>
    );

    const filename = `AnalisiMercato_${analysis.clientName.replace(/\s+/g, '_')}_MarcoMilanello.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[generate-pdf] Error:', err);
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
