export interface ReportSection {
  id: string;
  chapterNumber: number | null;
  title: string;
  content: string;
  depth?: 'critical' | 'important' | 'complementary' | 'operational';
}

export interface ParsedReport {
  executiveSummary: string;
  chapters: ReportSection[];
  roadmap: string;
  conclusions: string;
  rawText: string;
}

export type BadgeType = 'fact' | 'hypothesis' | 'untracked';

export interface StreamEvent {
  type: 'status' | 'chunk' | 'chapter' | 'ping' | 'complete' | 'error' | 'warning';
  data: Record<string, unknown>;
}
