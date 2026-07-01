import { describe, test, expect } from "@jest/globals";
import { windowMessages, MESSAGE_WINDOW } from "@/lib/messageWindow";

const seq = (n: number) => Array.from({ length: n }, (_v, i) => i);

describe("windowMessages", () => {
  test("shows everything when the thread is within the window", () => {
    expect(windowMessages(seq(10), 60)).toEqual({ shown: seq(10), earlierCount: 0 });
    expect(windowMessages(seq(60), 60).earlierCount).toBe(0);
  });

  test("keeps only the most recent N and reports how many are hidden", () => {
    const { shown, earlierCount } = windowMessages(seq(200), 60);
    expect(shown).toHaveLength(60);
    expect(earlierCount).toBe(140);
    expect(shown[0]).toBe(140);
    expect(shown[shown.length - 1]).toBe(199);
  });

  test("growing the window reveals older messages", () => {
    expect(windowMessages(seq(200), 120).shown).toHaveLength(120);
    expect(windowMessages(seq(200), 120).shown[0]).toBe(80);
  });

  test("handles empty / nullish input", () => {
    expect(windowMessages([], 60)).toEqual({ shown: [], earlierCount: 0 });
    expect(windowMessages(null as unknown as number[], 60)).toEqual({ shown: [], earlierCount: 0 });
  });

  test("a non-positive window falls back to the default", () => {
    expect(windowMessages(seq(200), 0).shown).toHaveLength(MESSAGE_WINDOW);
    expect(MESSAGE_WINDOW).toBe(60);
  });
});
