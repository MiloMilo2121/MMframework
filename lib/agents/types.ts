import { z } from 'zod';

export type Severity = 'none' | 'minor' | 'major' | 'blocker';

export type ReviewerId =
  | 'fact_checker'
  | 'coherence_auditor'
  | 'strategy_critic'
  | 'innovation_scout'
  | 'reality_breaker'
  | 'style_editor'
  | 'source_validator';

export type CritiqueCategory =
  | 'factual'
  | 'coherence'
  | 'strategy'
  | 'innovation'
  | 'logic'
  | 'style'
  | 'source';

export const SEVERITY_RANK: Record<Severity, number> = {
  none: 0,
  minor: 1,
  major: 2,
  blocker: 3,
};

export const CritiqueMessageSchema = z.object({
  agent: z.string(),
  severity: z.enum(['none', 'minor', 'major', 'blocker']),
  category: z.enum(['factual', 'coherence', 'strategy', 'innovation', 'logic', 'style', 'source']),
  claim: z.string(),
  evidence: z.string().optional(),
  suggestion: z.string(),
  confidence: z.number().min(0).max(1),
});
export type CritiqueMessage = z.infer<typeof CritiqueMessageSchema>;

export const CritiqueRoundSchema = z.object({
  chapter_number: z.number(),
  iteration: z.number(),
  critiques: z.array(CritiqueMessageSchema),
  durationMs: z.number().optional(),
});
export type CritiqueRound = z.infer<typeof CritiqueRoundSchema>;

export const VerdictSchema = z.object({
  decision: z.enum(['PROMOTE', 'REVISE', 'ESCALATE']),
  severity: z.enum(['none', 'minor', 'major', 'blocker']),
  iteration: z.number(),
  unresolved_issues: z.array(CritiqueMessageSchema),
  rationale: z.string().optional(),
});
export type Verdict = z.infer<typeof VerdictSchema>;

export const RevisionBriefSchema = z.object({
  must_fix: z.array(CritiqueMessageSchema),
  should_consider: z.array(CritiqueMessageSchema),
  insights_to_inject: z.array(z.string()),
  do_not: z.array(z.string()),
});
export type RevisionBrief = z.infer<typeof RevisionBriefSchema>;

export const StrategyThesisSchema = z.object({
  central_thesis: z.string(),
  narrative_angle: z.string(),
  positioning_statement: z.string(),
  selected_frameworks: z.array(z.string()),
  contrarian_insights: z.array(z.string()),
  must_address: z.array(z.string()),
  must_avoid: z.array(z.string()),
});
export type StrategyThesis = z.infer<typeof StrategyThesisSchema>;

export const ChapterSubPointSchema = z.object({
  title: z.string(),
  target_words: z.number(),
  data_anchors: z.array(z.string()),
  framework_lens: z.string().optional(),
});
export type ChapterSubPoint = z.infer<typeof ChapterSubPointSchema>;

export const ChapterOutlineSchema = z.object({
  chapter_number: z.number(),
  sub_points: z.array(ChapterSubPointSchema),
  thesis_link: z.string(),
  innovation_hooks: z.array(z.string()),
});
export type ChapterOutline = z.infer<typeof ChapterOutlineSchema>;

export interface ChapterDraft {
  chapter_number: number;
  iteration: number;
  text: string;
  wordCount: number;
  createdAt: number;
}

export interface FrameworkEntry {
  id: string;
  name: string;
  category: 'universal' | 'vertical';
  sectors: string[];
  use_cases: string[];
  applicable_chapters: string[];
  prompt_block: string;
  embedding?: number[];
}

export type CostCallback = (
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined,
  phase: string
) => void;

export const REVIEWER_LABELS: Record<ReviewerId, string> = {
  fact_checker: 'Fact-Checker',
  coherence_auditor: 'Coherence Auditor',
  strategy_critic: 'Strategy Critic',
  innovation_scout: 'Innovation Scout',
  reality_breaker: 'Reality Breaker',
  style_editor: 'Style Editor',
  source_validator: 'Source Validator',
};
