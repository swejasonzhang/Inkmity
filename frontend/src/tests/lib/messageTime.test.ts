import { describe, test, expect } from "@jest/globals";
import { formatMessageTime, formatMessageDateTime } from "@/lib/messageTime";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("formatMessageTime", () => {
  test("shows a clock time for today's messages (contains a colon)", () => {
    const out = formatMessageTime(Date.now());
    expect(out).toMatch(/\d:\d{2}/); // e.g. "3:45 PM"
  });

  test("shows a short date (no clock) for other days", () => {
    const out = formatMessageTime(Date.now() - 3 * DAY_MS);
    expect(out).not.toMatch(/:\d{2}/); // e.g. "Jun 27" — no time component
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("formatMessageDateTime", () => {
  test("returns empty string for missing or invalid input", () => {
    expect(formatMessageDateTime(undefined)).toBe("");
    expect(formatMessageDateTime("")).toBe("");
    expect(formatMessageDateTime("not-a-date")).toBe("");
    expect(formatMessageDateTime(NaN)).toBe("");
  });

  test("accepts both epoch numbers and ISO strings, formatting date + time", () => {
    const iso = new Date(Date.now() - DAY_MS).toISOString();
    const fromString = formatMessageDateTime(iso);
    const fromNumber = formatMessageDateTime(Date.parse(iso));
    expect(fromString).toContain(", ");
    expect(fromString).toMatch(/\d:\d{2}/);
    expect(fromNumber).toBe(fromString); // same instant, same label
  });

  test("omits the year for this year and includes it for other years", () => {
    const thisYear = formatMessageDateTime(Date.now());
    const year = new Date().getFullYear();
    expect(thisYear).not.toContain(String(year));

    const old = formatMessageDateTime(new Date(2019, 0, 15, 10, 30).getTime());
    expect(old).toContain("2019");
  });
});
