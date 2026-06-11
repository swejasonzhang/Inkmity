// Platform fee = max(price * effectivePct, minCents). Shared by the deposit
// checkout and the at-completion balance capture so the math can't drift.
export function computePlatformFeeCents(priceCents, effectivePct, minCents) {
  const base = Math.max(0, Number(priceCents || 0));
  const pct = Math.max(0, Math.min(1, Number(effectivePct)));
  return Math.max(Math.round(base * pct), Math.max(0, Number(minCents || 0)));
}
