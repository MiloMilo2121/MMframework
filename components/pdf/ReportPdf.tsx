/**
 * React-PDF document for market analysis reports.
 * Uses @react-pdf/renderer for server-side PDF generation with selectable text.
 */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Analysis } from '@/lib/types/analysis';
import type { HandoffOperativo } from '@/lib/types/handoff';

// Brand colors
const COLORS = {
  deepest: '#022226',
  dark: '#244F4F',
  primary: '#AAD8D8',
  textPrimary: '#1A2E2E',
  textSecondary: '#5A7878',
  border: '#E2EDED',
  surface: '#F8FAFA',
  white: '#FFFFFF',
};

const PAGE_PADDING = 40;
const FOOTER_HEIGHT = 30;

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING + FOOTER_HEIGHT,
    paddingHorizontal: PAGE_PADDING,
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.white,
    fontSize: 10,
    color: COLORS.textPrimary,
    lineHeight: 1.5,
  },
  // Cover
  coverPage: {
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
    backgroundColor: COLORS.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverLogoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  coverLogoName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.deepest,
    textAlign: 'right',
  },
  coverLogoSub: {
    fontSize: 8,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  coverLogoBox: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.deepest,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogoBoxText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  coverCenter: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 60,
  },
  coverEyebrow: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: COLORS.dark,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  coverBar: {
    width: 48,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.deepest,
    marginBottom: 10,
    lineHeight: 1.2,
  },
  coverSector: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  coverDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 24,
  },
  coverMetaGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  coverMetaItem: {
    flex: 1,
  },
  coverMetaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 9,
    color: COLORS.textPrimary,
  },
  coverBadge: {
    marginTop: 24,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coverBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
  },
  coverFooter: {
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    paddingTop: 10,
  },
  coverFooterText: {
    fontSize: 7,
    color: COLORS.textSecondary,
  },
  // Chapter
  chapterHeader: {
    marginBottom: 16,
  },
  chapterNumber: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  chapterTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.deepest,
    marginBottom: 8,
  },
  chapterDivider: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginBottom: 16,
  },
  chapterBody: {
    fontSize: 9.5,
    color: COLORS.textPrimary,
    lineHeight: 1.6,
  },
  // Roadmap
  roadmapTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.deepest,
    marginBottom: 16,
  },
  roadmapPhase: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  roadmapPhaseTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.deepest,
    marginBottom: 6,
  },
  roadmapPhaseItem: {
    fontSize: 9,
    color: COLORS.textPrimary,
    marginBottom: 3,
    paddingLeft: 8,
  },
  // Section heading
  sectionHeading: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.deepest,
    marginBottom: 10,
    marginTop: 6,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 16,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: COLORS.textSecondary,
  },
  // Watermark
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    textAlign: 'center',
    fontSize: 80,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    opacity: 0.04,
    transform: 'rotate(-35deg)',
  },
});

interface FooterProps {
  pageNumber?: string;
  clientName: string;
}

function Footer({ pageNumber, clientName }: FooterProps) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Confidenziale — {clientName} — Marco Milanello Strategic Consultant
      </Text>
      {pageNumber && (
        <Text style={styles.footerText} render={({ pageNumber: n, totalPages }) => `${n} / ${totalPages}`} />
      )}
    </View>
  );
}

function Watermark() {
  return (
    <Text style={styles.watermark} fixed>MMSC</Text>
  );
}

function Cover({ analysis }: { analysis: Analysis }) {
  const dateStr = new Date(analysis.createdAt).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Page size="A4" style={styles.coverPage}>
      {/* Logo row */}
      <View style={styles.coverLogoRow}>
        <View>
          <Text style={styles.coverLogoName}>Marco Milanello SC</Text>
          <Text style={styles.coverLogoSub}>Strategic Intelligence</Text>
        </View>
        <View style={styles.coverLogoBox}>
          <Text style={styles.coverLogoBoxText}>MM</Text>
        </View>
      </View>

      {/* Center content */}
      <View style={styles.coverCenter}>
        <Text style={styles.coverEyebrow}>Analisi di Mercato</Text>
        <View style={styles.coverBar} />
        <Text style={styles.coverTitle}>{analysis.clientName}</Text>
        <Text style={styles.coverSector}>
          {analysis.sector}{analysis.geography ? ` • ${analysis.geography}` : ''}
        </Text>
        <View style={styles.coverDivider} />
        <View style={styles.coverMetaGrid}>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaLabel}>Elaborato da</Text>
            <Text style={styles.coverMetaValue}>Marco Milanello Strategic Consultant</Text>
          </View>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaLabel}>Data</Text>
            <Text style={styles.coverMetaValue}>{dateStr}</Text>
          </View>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaLabel}>Versione</Text>
            <Text style={styles.coverMetaValue}>1.0</Text>
          </View>
        </View>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>Confidenziale</Text>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>
          Confidenziale — Analisi di Mercato elaborata da Marco Milanello Strategic Consultant — Non distribuire
        </Text>
      </View>
    </Page>
  );
}

function ChapterPage({
  number,
  title,
  body,
  clientName,
}: {
  number: number;
  title: string;
  body: string;
  clientName: string;
}) {
  // Strip markdown and clean text for PDF rendering
  const cleanBody = body
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();

  return (
    <Page size="A4" style={styles.page} wrap>
      <Watermark />
      <View style={styles.chapterHeader}>
        <Text style={styles.chapterNumber}>Capitolo {number}</Text>
        <Text style={styles.chapterTitle}>{title}</Text>
        <View style={styles.chapterDivider} />
      </View>
      <Text style={styles.chapterBody}>{cleanBody}</Text>
      <Footer clientName={clientName} pageNumber="auto" />
    </Page>
  );
}

function RoadmapPage({
  handoff,
  clientName,
}: {
  handoff: HandoffOperativo;
  clientName: string;
}) {
  const phases = [
    { label: 'Fase 1 — Primi 30 giorni', data: handoff.roadmap?.h1_30d },
    { label: 'Fase 2 — 31-60 giorni', data: handoff.roadmap?.h1_60d },
    { label: 'Fase 3 — 61-90 giorni', data: handoff.roadmap?.h2_90d },
  ];

  return (
    <Page size="A4" style={styles.page} wrap>
      <Watermark />
      <Text style={styles.roadmapTitle}>Piano Operativo 30/60/90 giorni</Text>
      {phases.map(({ label, data }) =>
        data ? (
          <View key={label} style={styles.roadmapPhase}>
            <Text style={styles.roadmapPhaseTitle}>{label}</Text>
            {(data.deliverables || []).map((item: string, i: number) => (
              <Text key={i} style={styles.roadmapPhaseItem}>• {item}</Text>
            ))}
            {data.kpi && (
              <Text style={{ ...styles.roadmapPhaseItem, marginTop: 6, fontFamily: 'Helvetica-Bold' }}>
                KPI: {data.kpi}
              </Text>
            )}
          </View>
        ) : null
      )}
      <Footer clientName={clientName} pageNumber="auto" />
    </Page>
  );
}

function ConclusionsPage({
  text,
  clientName,
}: {
  text: string;
  clientName: string;
}) {
  const clean = text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();

  return (
    <Page size="A4" style={styles.page} wrap>
      <Watermark />
      <Text style={styles.sectionHeading}>Conclusioni e Raccomandazioni</Text>
      <Text style={styles.chapterBody}>{clean}</Text>
      <Footer clientName={clientName} pageNumber="auto" />
    </Page>
  );
}

export interface ReportPdfProps {
  analysis: Analysis;
  chapters?: Array<{ id: string; number: number; title: string; content: string }>;
}

export function ReportPdf({ analysis, chapters = [] }: ReportPdfProps) {
  return (
    <Document
      title={`Analisi di Mercato — ${analysis.clientName}`}
      author="Marco Milanello Strategic Consultant"
      subject="Analisi di Mercato"
      creator="SalesMap Intelligence"
    >
      <Cover analysis={analysis} />

      {chapters.map((ch) => (
        <ChapterPage
          key={ch.id}
          number={ch.number}
          title={ch.title}
          body={ch.content}
          clientName={analysis.clientName}
        />
      ))}

      {analysis.handoffOperativo?.roadmap && (
        <RoadmapPage
          handoff={analysis.handoffOperativo}
          clientName={analysis.clientName}
        />
      )}

      {analysis.conclusions && (
        <ConclusionsPage
          text={analysis.conclusions}
          clientName={analysis.clientName}
        />
      )}
    </Document>
  );
}
