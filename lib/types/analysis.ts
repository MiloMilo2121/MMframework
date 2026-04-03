export type AnalysisStatus =
  | 'draft'
  | 'scouting'
  | 'blueprint'
  | 'researching'
  | 'complete'
  | 'error';

/**
 * Configuration vector passed from the UI to the orchestrator.
 * Controls report depth, writing tone, and activated research modules.
 *
 * effort_tier:
 *   1 = Essenziale  — 4 sezioni / ~15 sub-capitoli  (~$X)
 *   2 = Standard    — 5 sezioni / ~25 sub-capitoli  (~$XX)
 *   3 = Avanzato    — 6 sezioni / ~35 sub-capitoli  (~$XXX, include Meta Ads)
 *   4 = Elite       — 8 sezioni / ~50 sub-capitoli  (~$XXXX, include HR/M&A/Blue Ocean)
 */
export interface AnalysisVectorConfig {
  effort_tier: 1 | 2 | 3 | 4;
  target_audience: {
    /** e.g. "Titolare Storico", "CTO", "Direttore Commerciale" */
    role: string;
    /** e.g. "50-65", "30-40" */
    age_bracket: string;
    tech_literacy: 'low' | 'medium' | 'high';
    /** "high" activates Avvocato del Diavolo mode — zero ottimismo, solo prove */
    cynicism_level: 'standard' | 'high';
  };
  strategic_modifiers: {
    /** Forces EN/DE parallel queries on Exa for international benchmarks */
    international_context: boolean;
    include_ma_targets: boolean;
    include_blue_ocean: boolean;
  };
}

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
  /** Set at Step 1 — drives report depth, tone, and activated workers */
  vectorConfig?: AnalysisVectorConfig;
}
