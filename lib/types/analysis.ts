export type AnalysisStatus =
  | 'draft'
  | 'scouting'
  | 'blueprint'
  | 'researching'
  | 'complete'
  | 'error';

export interface ClientSnapshot {
  client_name: string;
  website: string;
  type: 'company' | 'professional' | 'unknown';
  sector: string;
  subsector: string;
  locations: string[];
  business_model_guess: 'b2b' | 'b2c' | 'mixed' | 'unknown';
  offers: string[];
  observable_sales_signals: string[];
  positioning_notes: string[];
  open_questions_for_call: string[];
  risks_of_misread: string[];
  sources: string[];
}

export interface AnalysisMetadata {
  totalTokens: number;
  generationTimeMs: number;
  chaptersFound: number;
  wordCount: number;
}

export interface Analysis {
  id: string;
  clientName: string;
  clientUrl: string;
  sector: string;
  geography?: string;
  businessType?: 'b2b' | 'b2c' | 'mixed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  status: AnalysisStatus;
  clientSnapshot?: ClientSnapshot;
  snapshotRawText?: string;
  questionnaire?: string;
  handoffData1?: import('./handoff').HandoffData1;
  handoffData1RawText?: string;
  reportPart1?: string;
  reportPart2?: string;
  contextBridge?: string;
  conclusions?: string;
  handoffOperativo?: import('./handoff').HandoffOperativo;
  errorMessage?: string;
  metadata: AnalysisMetadata;
}
