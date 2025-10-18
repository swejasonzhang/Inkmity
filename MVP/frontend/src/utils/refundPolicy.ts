export function isRefundEligible(
  startAtISO: string,
  now = new Date()
): boolean {
  const start = new Date(startAtISO).getTime();
  const diffMs = start - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours < 72;
}