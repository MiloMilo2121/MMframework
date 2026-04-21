/**
 * Cost tracker — per-model pricing + kill-switch per tier cap.
 * Pricing in USD per 1M tokens (input/output).
 */
import type { CostSnapshot } from '@/lib/types/analysis';
import type { EffortTier } from './prompts/architect';

const PRICING: Record<string, { input: number; output: number }> = {
  'deepseek/deepseek-r1':                  { input: 0.55,  output: 2.19  },
  'anthropic/claude-opus-4-6':             { input: 15.0,  output: 75.0  },
  'anthropic/claude-opus-4-7':             { input: 15.0,  output: 75.0  },
  'anthropic/claude-sonnet-4-6':           { input: 3.0,   output: 15.0  },
  'anthropic/claude-3-5-haiku-20241022':   { input: 0.8,   output: 4.0   },
  'xiaomi/mimo-v2-pro':                    { input: 0.4,   output: 1.6   },
  'google/gemini-2.0-flash-001':           { input: 0.1,   output: 0.4   },
};

const TIER_CAP_USD: Record<EffortTier, number> = {
  1: 5,
  2: 10,
  3: 20,
  4: 35,
};

const UNKNOWN_PRICING = { input: 5.0, output: 15.0 }; // conservative fallback

export class CostTracker {
  private totalUsd = 0;
  private byPhase: Record<string, number> = {};
  private tokens = 0;
  private tier: EffortTier;

  constructor(tier: EffortTier = 2) {
    this.tier = tier;
  }

  add(model: string, usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined, phase: string): number {
    if (!usage) return 0;
    const pricing = PRICING[model] ?? UNKNOWN_PRICING;
    const inputTokens = usage.prompt_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? 0;
    const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
    this.totalUsd += cost;
    this.byPhase[phase] = (this.byPhase[phase] ?? 0) + cost;
    this.tokens += inputTokens + outputTokens;
    return cost;
  }

  snapshot(): CostSnapshot {
    return {
      totalUsd: Math.round(this.totalUsd * 10000) / 10000,
      byPhase: { ...this.byPhase },
      tokens: this.tokens,
    };
  }

  isOverBudget(): boolean {
    return this.totalUsd >= TIER_CAP_USD[this.tier];
  }

  capUsd(): number {
    return TIER_CAP_USD[this.tier];
  }
}
