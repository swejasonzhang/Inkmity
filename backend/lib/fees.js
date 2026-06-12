// Platform fee the client pays: base + pct of price, capped. Shared by the
// deposit checkout and the at-completion capture so the fee can't drift.
// e.g. $10 + 5% of the tattoo price, never more than $50.
export function computePlatformFeeCents(priceCents, { baseCents = 0, pct = 0, capCents = 0 } = {}) {
  const price = Math.max(0, Number(priceCents || 0));
  const fee = Math.max(0, Number(baseCents || 0)) + Math.round(price * Math.max(0, Number(pct || 0)));
  const cap = Math.max(0, Number(capCents || 0));
  return Math.max(0, cap > 0 ? Math.min(fee, cap) : fee);
}

// Estimate Stripe's card-processing fee on a charge. Netted out of the
// artist/studio payout so the artist bears processing (as with any card
// terminal) and the platform keeps the flat fee clean.
export function estimateStripeFeeCents(amountCents, pct = 0.029, flatCents = 30) {
  const a = Math.max(0, Number(amountCents || 0));
  if (a === 0) return 0;
  return Math.round(a * Math.max(0, Number(pct))) + Math.max(0, Number(flatCents || 0));
}
