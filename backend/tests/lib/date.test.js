import { describe, test, expect } from "@jest/globals";
import { dayBoundsUTC } from "../../lib/date.js";

describe("dayBoundsUTC", () => {
  test("returns UTC midnight start and next-day midnight end", () => {
    const { start, end } = dayBoundsUTC("2026-06-15");
    expect(start.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-16T00:00:00.000Z");
  });

  test("end is exactly 24 hours after start", () => {
    const { start, end } = dayBoundsUTC("2026-01-01");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  test("rolls over month boundaries", () => {
    const { start, end } = dayBoundsUTC("2026-01-31");
    expect(start.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  test("handles a leap day", () => {
    const { end } = dayBoundsUTC("2024-02-29");
    expect(end.toISOString()).toBe("2024-03-01T00:00:00.000Z");
  });
});
