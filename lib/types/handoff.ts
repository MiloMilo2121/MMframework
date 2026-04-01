export interface HandoffData1Goal {
  horizon_days: number;
  goal: string;
  metric: string;
  constraint: string;
  risk_note: string;
}

export interface HandoffData1Target {
  segment: string;
  decision_maker: string;
  triggers: string[];
  notes: string;
}

export interface HandoffData1Offer {
  name: string;
  for_whom: string;
  price: string;
  delivery_time: string;
  margin: string;
}

export interface HandoffData1Channel {
  channel: string;
  status: 'active' | 'inactive' | 'unknown';
  notes: string;
}

export interface HandoffData1Metrics {
  leads_per_month: string;
  win_rate: string;
  avg_deal_value: string;
  sales_cycle_time: string;
  monthly_marketing_spend: string;
}

export interface HandoffData1USP {
  usp: string;
  proof: string;
  risk: string;
  how_to_prove_7_14d: string;
}

export interface HandoffData1ResearchQuestion {
  question: string;
  decision_unlocked: string;
  missing_data: string;
  how_to_get: string;
}

export interface HandoffData1MicroSegment {
  segment: string;
  why_easy: string;
  where_to_reach: string;
  breakpoint: string;
  test_7_14d: {
    action: string;
    kpi: string;
    success_threshold: string;
  };
}

export interface HandoffData1NonTracked {
  field: string;
  risk: string;
  how_to_recover: string;
}

export interface HandoffData1Contradiction {
  issue: string;
  impact: string;
  fix: string;
}

export interface HandoffData1 {
  client: {
    name: string;
    location: string;
    business_model: 'b2b' | 'b2c' | 'mixed' | 'non_tracked';
    offer_summary: string;
    capacity_constraints: string[];
    sales_process_summary: string;
    main_bottleneck: string;
  };
  goals: HandoffData1Goal[];
  current_target: HandoffData1Target[];
  offers: HandoffData1Offer[];
  current_channels: HandoffData1Channel[];
  metrics: HandoffData1Metrics;
  usp_candidates: HandoffData1USP[];
  research_questions_prioritized: HandoffData1ResearchQuestion[];
  micro_segments_hypotheses: HandoffData1MicroSegment[];
  non_tracked: HandoffData1NonTracked[];
  contradictions: HandoffData1Contradiction[];
}

export interface ImmediateTest {
  priority: number;
  action: string;
  channel: string;
  segment: string;
  kpi: string;
  success_threshold: string;
  failure_threshold: string;
  timeline_days: number;
  ice_score: {
    impact: number;
    confidence: number;
    ease: number;
    total: number;
  };
}

export interface RoadmapPhase {
  deliverables: string[];
  kpi: string;
  risk: string;
  early_signal: string;
}

export interface TopRisk {
  risk: string;
  impact: 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  early_signal: string;
  countermeasure: string;
}

export interface MicroSegment {
  name: string;
  status: 'confirmed' | 'updated' | 'new' | 'eliminated';
  trigger: string;
  channel: string;
  message: string;
  test_action: string;
  test_kpi: string;
  test_threshold: string;
}

export interface CriticalGap {
  field: string;
  impact: string;
  recovery_steps: string[];
  recovery_owner: string;
  recovery_time_hours: number;
}

export interface HandoffOperativo {
  version: string;
  generated_at: string;
  client: {
    name: string;
    sector: string;
    location: string;
  };
  strategic_choices: {
    primary_segment: string;
    secondary_segment: string;
    primary_channel: string;
    secondary_channel: string;
    entry_offer: string;
    core_offer: string;
    premium_offer: string;
    positioning: string;
    main_usp: string;
  };
  messages: Array<{
    message: string;
    promise: string;
    proof_status: 'proven' | 'partial' | 'unproven';
    proof_available: string;
    main_objection: string;
    objection_response: string;
    breakpoint: string;
  }>;
  immediate_tests: ImmediateTest[];
  roadmap: {
    h1_30d: RoadmapPhase;
    h1_60d: RoadmapPhase;
    h2_90d: RoadmapPhase;
  };
  top_risks: TopRisk[];
  micro_segments: MicroSegment[];
  critical_gaps: CriticalGap[];
  porter_five_forces_summary: {
    new_entrants: string;
    supplier_power: string;
    buyer_power: string;
    substitutes: string;
    rivalry: string;
    overall_attractiveness: 'high' | 'medium' | 'low';
  };
  ansoff_classification: {
    primary_strategy: 'market_penetration' | 'market_development' | 'product_development' | 'diversification';
    rationale: string;
  };
  jtbd_primary_job: {
    functional_job: string;
    emotional_job: string;
    social_job: string;
    metrics_of_success: string[];
  };
  blue_ocean_opportunities: {
    eliminate: string[];
    reduce: string[];
    raise: string[];
    create: string[];
  };
  next_phase: {
    recommended_service: string;
    rationale: string;
    estimated_timeline_days: number;
  };
}
