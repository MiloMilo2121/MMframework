import { z } from 'zod';
import { extractJson } from './extract-json';
import type { HandoffData1, HandoffOperativo } from '@/lib/types/handoff';

// ─── HandoffData1 Zod Schema ───────────────────────────────────────────────

const GoalSchema = z.object({
  horizon_days: z.number(),
  goal: z.string(),
  metric: z.string(),
  constraint: z.string(),
  risk_note: z.string(),
});

const TargetSchema = z.object({
  segment: z.string(),
  decision_maker: z.string(),
  triggers: z.array(z.string()),
  notes: z.string(),
});

const OfferSchema = z.object({
  name: z.string(),
  for_whom: z.string(),
  price: z.string(),
  delivery_time: z.string(),
  margin: z.string(),
});

const ChannelSchema = z.object({
  channel: z.string(),
  status: z.enum(['active', 'inactive', 'unknown']),
  notes: z.string(),
});

const MetricsSchema = z.object({
  leads_per_month: z.string(),
  win_rate: z.string(),
  avg_deal_value: z.string(),
  sales_cycle_time: z.string(),
  monthly_marketing_spend: z.string(),
});

const USPSchema = z.object({
  usp: z.string(),
  proof: z.string(),
  risk: z.string(),
  how_to_prove_7_14d: z.string(),
});

const ResearchQuestionSchema = z.object({
  question: z.string(),
  decision_unlocked: z.string(),
  missing_data: z.string(),
  how_to_get: z.string(),
});

const MicroSegmentHypothesisSchema = z.object({
  segment: z.string(),
  why_easy: z.string(),
  where_to_reach: z.string(),
  breakpoint: z.string(),
  test_7_14d: z.object({
    action: z.string(),
    kpi: z.string(),
    success_threshold: z.string(),
  }),
});

const NonTrackedSchema = z.object({
  field: z.string(),
  risk: z.string(),
  how_to_recover: z.string(),
});

const ContradictionSchema = z.object({
  issue: z.string(),
  impact: z.string(),
  fix: z.string(),
});

export const HandoffData1Schema = z.object({
  client: z.object({
    name: z.string(),
    location: z.string(),
    business_model: z.enum(['b2b', 'b2c', 'mixed', 'non_tracked']),
    offer_summary: z.string(),
    capacity_constraints: z.array(z.string()),
    sales_process_summary: z.string(),
    main_bottleneck: z.string(),
  }),
  goals: z.array(GoalSchema),
  current_target: z.array(TargetSchema),
  offers: z.array(OfferSchema),
  current_channels: z.array(ChannelSchema),
  metrics: MetricsSchema,
  usp_candidates: z.array(USPSchema),
  research_questions_prioritized: z.array(ResearchQuestionSchema),
  micro_segments_hypotheses: z.array(MicroSegmentHypothesisSchema),
  non_tracked: z.array(NonTrackedSchema),
  contradictions: z.array(ContradictionSchema),
});

// ─── HandoffOperativo Zod Schema ────────────────────────────────────────────

const ImmediateTestSchema = z.object({
  priority: z.number(),
  action: z.string(),
  channel: z.string(),
  segment: z.string(),
  kpi: z.string(),
  success_threshold: z.string(),
  failure_threshold: z.string(),
  timeline_days: z.number(),
  ice_score: z.object({
    impact: z.number(),
    confidence: z.number(),
    ease: z.number(),
    total: z.number(),
  }),
});

const RoadmapPhaseSchema = z.object({
  deliverables: z.array(z.string()),
  kpi: z.string(),
  risk: z.string(),
  early_signal: z.string(),
});

export const HandoffOperativoSchema = z.object({
  version: z.string(),
  generated_at: z.string(),
  client: z.object({ name: z.string(), sector: z.string(), location: z.string() }),
  strategic_choices: z.object({
    primary_segment: z.string(),
    secondary_segment: z.string(),
    primary_channel: z.string(),
    secondary_channel: z.string(),
    entry_offer: z.string(),
    core_offer: z.string(),
    premium_offer: z.string(),
    positioning: z.string(),
    main_usp: z.string(),
  }),
  messages: z.array(z.object({
    message: z.string(),
    promise: z.string(),
    proof_status: z.enum(['proven', 'partial', 'unproven']),
    proof_available: z.string(),
    main_objection: z.string(),
    objection_response: z.string(),
    breakpoint: z.string(),
  })),
  immediate_tests: z.array(ImmediateTestSchema),
  roadmap: z.object({
    h1_30d: RoadmapPhaseSchema,
    h1_60d: RoadmapPhaseSchema,
    h2_90d: RoadmapPhaseSchema,
  }),
  top_risks: z.array(z.object({
    risk: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    probability: z.enum(['high', 'medium', 'low']),
    early_signal: z.string(),
    countermeasure: z.string(),
  })),
  micro_segments: z.array(z.object({
    name: z.string(),
    status: z.enum(['confirmed', 'updated', 'new', 'eliminated']),
    trigger: z.string(),
    channel: z.string(),
    message: z.string(),
    test_action: z.string(),
    test_kpi: z.string(),
    test_threshold: z.string(),
  })),
  critical_gaps: z.array(z.object({
    field: z.string(),
    impact: z.string(),
    recovery_steps: z.array(z.string()),
    recovery_owner: z.string(),
    recovery_time_hours: z.number(),
  })),
  porter_five_forces_summary: z.object({
    new_entrants: z.string(),
    supplier_power: z.string(),
    buyer_power: z.string(),
    substitutes: z.string(),
    rivalry: z.string(),
    overall_attractiveness: z.enum(['high', 'medium', 'low']),
  }),
  ansoff_classification: z.object({
    primary_strategy: z.enum(['market_penetration', 'market_development', 'product_development', 'diversification']),
    rationale: z.string(),
  }),
  jtbd_primary_job: z.object({
    functional_job: z.string(),
    emotional_job: z.string(),
    social_job: z.string(),
    metrics_of_success: z.array(z.string()),
  }),
  blue_ocean_opportunities: z.object({
    eliminate: z.array(z.string()),
    reduce: z.array(z.string()),
    raise: z.array(z.string()),
    create: z.array(z.string()),
  }),
  next_phase: z.object({
    recommended_service: z.string(),
    rationale: z.string(),
    estimated_timeline_days: z.number(),
  }),
});

// ─── Parse Functions ────────────────────────────────────────────────────────

export function parseHandoffData1(rawText: string): {
  data: HandoffData1 | null;
  error: string | null;
} {
  try {
    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText);
    const result = HandoffData1Schema.safeParse(parsed);
    if (result.success) {
      return { data: result.data as HandoffData1, error: null };
    }
    // Return partial data even if validation fails — better than nothing
    console.warn('[parse-handoff] Validation warnings:', result.error.issues);
    return { data: parsed as HandoffData1, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Parse failed' };
  }
}

export function parseHandoffOperativo(rawText: string): {
  data: HandoffOperativo | null;
  error: string | null;
} {
  try {
    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText);
    const result = HandoffOperativoSchema.safeParse(parsed);
    if (result.success) {
      return { data: result.data as HandoffOperativo, error: null };
    }
    console.warn('[parse-handoff] HandoffOperativo validation warnings:', result.error.issues);
    return { data: parsed as HandoffOperativo, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Parse failed' };
  }
}
