export function dayBoundsUTC(isoDate) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return { start, end };
}