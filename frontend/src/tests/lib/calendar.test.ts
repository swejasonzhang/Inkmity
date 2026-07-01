import { describe, test, expect } from "@jest/globals";
import {
  monthMeta,
  buildMonthCells,
  dateKey,
  groupBookingsByDay,
  isPastDay,
  isActiveBooking,
} from "@/lib/calendar";

describe("monthMeta", () => {
  test("computes the number of days in the month", () => {
    expect(monthMeta(new Date(2026, 5, 1)).days).toBe(30); // June
    expect(monthMeta(new Date(2026, 1, 10)).days).toBe(28); // Feb 2026 (non-leap)
    expect(monthMeta(new Date(2024, 1, 10)).days).toBe(29); // Feb 2024 (leap)
    expect(monthMeta(new Date(2026, 0, 1)).days).toBe(31); // Jan
  });

  test("first weekday is Monday-indexed (0-6)", () => {
    const fw = monthMeta(new Date(2026, 5, 1)).firstWeekday;
    expect(fw).toBeGreaterThanOrEqual(0);
    expect(fw).toBeLessThanOrEqual(6);
  });
});

describe("buildMonthCells", () => {
  test("builds a 42-cell grid with leading empties, then the month's days", () => {
    const cells = buildMonthCells({ year: 2026, month: 0, days: 31, firstWeekday: 3 });
    expect(cells).toHaveLength(42);

    // 3 leading blanks
    expect(cells.slice(0, 3).every((c) => !c.inMonth && c.dayNum === null && c.date === null)).toBe(true);

    // day 1 lands at index 3
    expect(cells[3]).toMatchObject({ inMonth: true, dayNum: 1 });
    expect(cells[3].date?.getDate()).toBe(1);

    // day 31 is the last in-month cell, then trailing blanks
    expect(cells[33]).toMatchObject({ inMonth: true, dayNum: 31 });
    expect(cells[34].inMonth).toBe(false);
  });
});

describe("dateKey", () => {
  test("formats local date parts with zero-padding", () => {
    expect(dateKey(new Date(2026, 2, 5))).toBe("2026-03-05");
    expect(dateKey(new Date(2026, 11, 25))).toBe("2026-12-25");
  });
});

describe("groupBookingsByDay", () => {
  test("bins bookings by local day and sorts each day by start time", () => {
    const morning = new Date(2026, 5, 15, 9).toISOString();
    const evening = new Date(2026, 5, 15, 18).toISOString();
    const nextDay = new Date(2026, 5, 16, 12).toISOString();

    const map = groupBookingsByDay([{ start: evening }, { start: nextDay }, { start: morning }]);

    expect([...map.keys()].sort()).toEqual(["2026-06-15", "2026-06-16"]);
    expect(map.get("2026-06-15")!.map((b) => b.start)).toEqual([morning, evening]);
    expect(map.get("2026-06-16")).toHaveLength(1);
  });

  test("skips bookings with an unparseable start date", () => {
    const map = groupBookingsByDay([{ start: "not-a-date" }, { start: new Date(2026, 5, 15).toISOString() }]);
    expect(map.size).toBe(1);
    expect(map.has("2026-06-15")).toBe(true);
  });
});

describe("isPastDay", () => {
  test("days before today are past; today and future are not", () => {
    const now = new Date(2026, 5, 15, 12);
    expect(isPastDay(new Date(2026, 5, 14), now)).toBe(true);
    expect(isPastDay(new Date(2026, 5, 15), now)).toBe(false);
    expect(isPastDay(new Date(2026, 5, 16), now)).toBe(false);
  });
});

describe("isActiveBooking", () => {
  test("cancelled, no-show, and denied are inactive; everything else is active", () => {
    expect(isActiveBooking("cancelled")).toBe(false);
    expect(isActiveBooking("no-show")).toBe(false);
    expect(isActiveBooking("denied")).toBe(false);
    expect(isActiveBooking("accepted")).toBe(true);
    expect(isActiveBooking("pending")).toBe(true);
    expect(isActiveBooking(undefined)).toBe(true);
  });
});
