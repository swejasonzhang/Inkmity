export function computePlatformFeeCents(priceCents, { baseCents = 0, pct = 0, capCents = 0 } = {}) {
  const price = Math.max(0, Number(priceCents || 0));
  const fee = Math.max(0, Number(baseCents || 0)) + Math.round(price * Math.max(0, Number(pct || 0)));
  const cap = Math.max(0, Number(capCents || 0));
  return Math.max(0, cap > 0 ? Math.min(fee, cap) : fee);
}

export function estimateStripeFeeCents(amountCents, pct = 0.029, flatCents = 30) {
  const a = Math.max(0, Number(amountCents || 0));
  if (a === 0) return 0;
  return Math.round(a * Math.max(0, Number(pct))) + Math.max(0, Number(flatCents || 0));
}
