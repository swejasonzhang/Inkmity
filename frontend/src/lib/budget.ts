export const BUDGET_MIN = 100;
export const BUDGET_MAX = 5000;
export const BUDGET_STEP = 50;
export const BUDGET_MIN_GAP = 100;

export const clampNumber = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(v, hi));

export const snapToStep = (v: number, step: number = BUDGET_STEP): number =>
  Math.round(v / step) * step;

export function normalizeBudgetRange(
  rawMin: number,
  rawMax: number
): { min: number; max: number } {
  const min = clampNumber(snapToStep(rawMin), BUDGET_MIN, BUDGET_MAX - BUDGET_MIN_GAP);
  const max = clampNumber(snapToStep(rawMax), min + BUDGET_MIN_GAP, BUDGET_MAX);
  return { min, max };
}

export function priceBucketFromRange(lo: number, hi: number): string {
  if (lo <= BUDGET_MIN && hi >= BUDGET_MAX) return "all";
  if (hi <= 500) return "100-500";
  if (hi <= 1000) return "500-1000";
  if (hi <= 2000) return "1000-2000";
  if (hi <= 5000) return "2000-5000";
  return "5000+";
}

export function normalizeOption(opts: string[], value?: string): string {
  return opts.find((o) => o.toLowerCase() === (value || "").toLowerCase()) ?? "none";
}
