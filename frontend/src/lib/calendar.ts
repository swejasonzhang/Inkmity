// Pure calendar logic extracted from CalendarView so the month grid and the
// day-binning (which is timezone-sensitive and was a source of test flakiness)
// can be tested in isolation.

export type CalBooking = { start: string | number | Date; status?: string };

export type MonthMeta = { year: number; month: number; days: number; firstWeekday: number };

/** Month grid metadata for a cursor date. `firstWeekday` is Monday-first (0-6). */
export function monthMeta(cursor: Date): MonthMeta {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const firstWeekday = (start.getDay() + 6) % 7;
  const days = end.getDate();
  return { year, month, days, firstWeekday };
}

export type MonthCell = { inMonth: boolean; dayNum: number | null; date: Date | null };

/** The fixed 6x7 grid of cells for a month (leading/trailing days are empty). */
export function buildMonthCells(meta: MonthMeta, totalCells = 42): MonthCell[] {
  return Array.from({ length: totalCells }).map((_, i) => {
    const dayNum = i - meta.firstWeekday + 1;
    const inMonth = dayNum >= 1 && dayNum <= meta.days;
    const date = inMonth ? new Date(meta.year, meta.month, dayNum) : null;
    return { inMonth, dayNum: inMonth ? dayNum : null, date };
  });
}

/** Local-date day key "YYYY-MM-DD" (uses local calendar parts, not UTC). */
export function dateKey(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Groups bookings by their local day, each day's list sorted by start time. */
export function groupBookingsByDay<T extends CalBooking>(bookings: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const b of bookings) {
    const d = new Date(b.start);
    if (isNaN(d.getTime())) continue;
    const key = dateKey(d);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  for (const key of map.keys()) {
    map.get(key)!.sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }
  return map;
}

/** True if the day is strictly before today (midnight). `now` is injectable for tests. */
export function isPastDay(d: Date, now: Date = new Date()): boolean {
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  return d < t;
}

const INACTIVE_STATUSES = new Set(["cancelled", "no-show", "denied"]);

/** A booking still "counts" unless it was cancelled, a no-show, or denied. */
export function isActiveBooking(status?: string): boolean {
  return !INACTIVE_STATUSES.has(status ?? "");
}
