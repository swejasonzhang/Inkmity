export function dayBoundsUTC(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));
  return { start, end };
}