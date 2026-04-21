/**
 * Client-safe constants from cost-tracker (no server-only imports).
 */
export const TIER_CAP_USD_MAP: Record<1 | 2 | 3 | 4, number> = {
  1: 5,
  2: 10,
  3: 20,
  4: 35,
};
