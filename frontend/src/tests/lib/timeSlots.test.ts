import { describe, test, expect } from "@jest/globals";
import {
  toMinutes,
  atTimeLocal,
  addMinutesLocal,
  buildDefaultFrames,
  timeKeyLocal,
} from "@/lib/timeSlots";

const DAY = new Date(2026, 5, 30);

describe("toMinutes", () => {
  test("parses HH:MM into minutes past midnight", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("10:30")).toBe(630);
    expect(toMinutes("22:00")).toBe(1320);
  });

  test("treats missing/garbage parts as zero", () => {
    expect(toMinutes("9")).toBe(540);
    expect(toMinutes("")).toBe(0);
    expect(toMinutes("ab:cd")).toBe(0);
  });
});

describe("atTimeLocal / timeKeyLocal round-trip", () => {
  test("places a time on the day and reads it back regardless of timezone", () => {
    for (const hm of ["00:00", "09:05", "10:30", "23:45"]) {
      expect(timeKeyLocal(atTimeLocal(DAY, hm))).toBe(hm);
    }
  });

  test("atTimeLocal keeps the same calendar day and zeroes seconds", () => {
    const d = atTimeLocal(DAY, "10:30");
    expect(d.getDate()).toBe(DAY.getDate());
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});

describe("addMinutesLocal", () => {
  test("advances by whole minutes", () => {
    const base = atTimeLocal(DAY, "10:00");
    expect(timeKeyLocal(addMinutesLocal(base, 30))).toBe("10:30");
    expect(timeKeyLocal(addMinutesLocal(base, 90))).toBe("11:30");
  });
});

describe("buildDefaultFrames", () => {
  test("defaults to 10:00–22:00 in 30-min steps (24 slots, end-exclusive)", () => {
    const frames = buildDefaultFrames(DAY);
    expect(frames.length).toBe(24);
    expect(timeKeyLocal(frames[0])).toBe("10:00");
    expect(timeKeyLocal(frames[frames.length - 1])).toBe("21:30");
  });

  test("honours a custom window and step", () => {
    const frames = buildDefaultFrames(DAY, "09:00", "11:00", 60);
    expect(frames.map(timeKeyLocal)).toEqual(["09:00", "10:00"]);
  });

  test("returns no slots when the window is empty or inverted", () => {
    expect(buildDefaultFrames(DAY, "12:00", "12:00")).toEqual([]);
    expect(buildDefaultFrames(DAY, "14:00", "10:00")).toEqual([]);
  });
});
