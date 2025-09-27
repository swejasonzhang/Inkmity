export function dayBoundsUTC(dateISO) {
  const start = new Date(`${dateISO}T00:00:00.000Z`);
  const end   = new Date(`${dateISO}T23:59:59.999Z`);
  return { start, end };
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}