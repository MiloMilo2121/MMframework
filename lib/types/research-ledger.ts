/**
 * ResearchLedger — the central context shared between all 5 Workers
 * and consumed by the CoherenceGate.
 *
 * Workers each return a ModuleOutput. The orchestrator merges them
 * into the ledger before passing to the CoherenceGate.
 */

export type ModuleId =
  | 'market_dynamics'
  | 'competitor_intelligence'
  | 'product_tech'
  | 'economics_pricing'
  | 'swoc_synthesis'
  | 'marketing_angles'    // reserved — tier 2+ (Meta Ads / Copy worker, not yet implemented)
  | 'corporate_health';  // reserved — tier 3+ (LinkedIn/HR worker, not yet implemented)

export type VerificationStatus = 'verified' | 'estimated' | 'unverified' | 'contradicted';

export interface VerifiedFact {
  claim: string;
  value?: string;
  source_name: string;
  source_url?: string;
  published_date?: string;
  status: VerificationStatus;
  contributed_by: ModuleId;
}

export interface MarketDataPoint {
  metric: string;          // e.g. "TAM_italia_2025"
  value: string;
  unit: string;
  year?: number;
  geography?: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  contributed_by: ModuleId;
}

export interface CompetitorEntry {
  name: string;
  url?: string;
  pricing_model?: string;
  price_range?: string;
  key_messages: string[];
  strengths: string[];
  weaknesses: string[];
  review_score?: number;
  advertising_channels?: string[];
  contributed_by: ModuleId;
}

export interface ContradictionEntry {
  topic: string;
  module_a: ModuleId;
  claim_a: string;
  module_b: ModuleId;
  claim_b: string;
  resolution?: string;
}

export interface ModuleOutput {
  module_id: ModuleId;
  status: 'complete' | 'error' | 'partial';
  tool_calls_used: number;
  summary_markdown: string;
  verified_facts: VerifiedFact[];
  market_data: MarketDataPoint[];
  competitor_entries: CompetitorEntry[];
  error_message?: string;
  // Module-specific structured data (JSON string for flexibility)
  structured_data?: string;
}

export interface ResearchLedger {
  analysis_id: string;
  client_name: string;
  sector: string;
  created_at: string;

  // Input context slice given to every Worker
  initial_context: {
    client_summary: string;
    business_model: string;
    geography: string;
    offers_summary: string;
    key_questions: string[];
    known_competitors: string[];
  };

  // Deduplicated indices built by merging Worker outputs
  verified_facts: VerifiedFact[];
  market_data: MarketDataPoint[];
  competitor_matrix: CompetitorEntry[];
  contradictions_log: ContradictionEntry[];

  // Individual module outputs
  modules: Partial<Record<ModuleId, ModuleOutput>>;
}

export function createEmptyLedger(params: {
  analysisId: string;
  clientName: string;
  sector: string;
  initialContext: ResearchLedger['initial_context'];
}): ResearchLedger {
  return {
    analysis_id: params.analysisId,
    client_name: params.clientName,
    sector: params.sector,
    created_at: new Date().toISOString(),
    initial_context: params.initialContext,
    verified_facts: [],
    market_data: [],
    competitor_matrix: [],
    contradictions_log: [],
    modules: {},
  };
}

/**
 * Ledger Slicer — returns only the subset of ledger data relevant to a given
 * set of focus areas (ModuleIds). Used by the Ghostwriter to receive surgical
 * context instead of the full ledger JSON, preventing context saturation.
 *
 * For unknown/future ModuleIds (marketing_angles, corporate_health) the
 * arrays will simply be empty — the Ghostwriter handles this gracefully.
 */
export function filterLedgerByFocus(
  ledger: ResearchLedger,
  focusAreas: string[]
): Pick<ResearchLedger, 'verified_facts' | 'market_data' | 'competitor_matrix'> {
  const areas = new Set(focusAreas);
  return {
    verified_facts: ledger.verified_facts.filter((f) => areas.has(f.contributed_by)),
    market_data: ledger.market_data.filter((d) => areas.has(d.contributed_by)),
    // Competitor data is always gated on competitor_intelligence being in focus
    competitor_matrix: areas.has('competitor_intelligence') ? ledger.competitor_matrix : [],
  };
}

/** Merge a WorkerOutput into the ledger (deduplicates by claim/name) */
export function mergeLedger(ledger: ResearchLedger, output: ModuleOutput): void {
  ledger.modules[output.module_id] = output;

  for (const fact of output.verified_facts) {
    const dupe = ledger.verified_facts.find((f) => f.claim === fact.claim);
    if (!dupe) ledger.verified_facts.push(fact);
  }

  for (const dataPoint of output.market_data) {
    const dupe = ledger.market_data.find((d) => d.metric === dataPoint.metric);
    if (!dupe) {
      ledger.market_data.push(dataPoint);
    } else if (dataPoint.confidence === 'high' && dupe.confidence !== 'high') {
      // Higher confidence wins
      Object.assign(dupe, dataPoint);
    }
  }

  for (const competitor of output.competitor_entries) {
    const existing = ledger.competitor_matrix.find(
      (c) => c.name.toLowerCase() === competitor.name.toLowerCase()
    );
    if (!existing) {
      ledger.competitor_matrix.push(competitor);
    } else {
      // Merge: extend arrays, keep best data (Array.from for ES2015 compat)
      existing.strengths = Array.from(new Set([...existing.strengths, ...competitor.strengths]));
      existing.weaknesses = Array.from(new Set([...existing.weaknesses, ...competitor.weaknesses]));
      existing.key_messages = Array.from(new Set([...existing.key_messages, ...competitor.key_messages]));
      if (!existing.price_range && competitor.price_range) existing.price_range = competitor.price_range;
      if (!existing.review_score && competitor.review_score) existing.review_score = competitor.review_score;
    }
  }
}
