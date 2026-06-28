import { describe, test, expect, afterEach, jest } from "@jest/globals";
import { formatActivityStatus } from "@/lib/activity";

const MIN = 1000 * 60;
const HOUR = MIN * 60;
const DAY = HOUR * 24;

afterEach(() => {
  jest.restoreAllMocks();
});

function freezeNow(now: number) {
  jest.spyOn(Date, "now").mockReturnValue(now);
}

describe("formatActivityStatus", () => {
  test("reports currently active when online", () => {
    expect(formatActivityStatus(true, null)).toBe("Currently active");
    expect(formatActivityStatus(true, 123)).toBe("Currently active");
  });

  test("reports never active when no lastActive timestamp", () => {
    expect(formatActivityStatus(false, null)).toBe("Never active");
    expect(formatActivityStatus(false, undefined)).toBe("Never active");
    expect(formatActivityStatus(undefined, 0)).toBe("Never active");
  });

  test("reports just now under a minute", () => {
    const now = 1_000_000_000;
    freezeNow(now);
    expect(formatActivityStatus(false, now - 30 * 1000)).toBe("Just now");
  });

  test("reports minutes with singular/plural", () => {
    const now = 1_000_000_000;
    freezeNow(now);
    expect(formatActivityStatus(false, now - 1 * MIN)).toBe("Last active 1 min ago");
    expect(formatActivityStatus(false, now - 5 * MIN)).toBe("Last active 5 mins ago");
  });

  test("reports hours with singular/plural", () => {
    const now = 1_000_000_000;
    freezeNow(now);
    expect(formatActivityStatus(false, now - 1 * HOUR)).toBe("Last active 1 hour ago");
    expect(formatActivityStatus(false, now - 5 * HOUR)).toBe("Last active 5 hours ago");
  });

  test("reports days with singular/plural", () => {
    const now = 1_000_000_000;
    freezeNow(now);
    expect(formatActivityStatus(false, now - 1 * DAY)).toBe("Last active 1 day ago");
    expect(formatActivityStatus(false, now - 3 * DAY)).toBe("Last active 3 days ago");
  });

  test("reports weeks with singular/plural", () => {
    const now = 1_000_000_000;
    freezeNow(now);
    expect(formatActivityStatus(false, now - 7 * DAY)).toBe("Last active 1 week ago");
    expect(formatActivityStatus(false, now - 21 * DAY)).toBe("Last active 3 weeks ago");
  });

  test("reports months once past four weeks", () => {
    const now = 1_000_000_000;
    freezeNow(now);
    expect(formatActivityStatus(false, now - 30 * DAY)).toBe("Last active 1 month ago");
    expect(formatActivityStatus(false, now - 90 * DAY)).toBe("Last active 3 months ago");
  });
});
