import { describe, test, expect } from "@jest/globals";
import {
  BUDGET_MIN,
  BUDGET_MAX,
  BUDGET_MIN_GAP,
  clampNumber,
  snapToStep,
  normalizeBudgetRange,
  priceBucketFromRange,
  normalizeOption,
} from "@/lib/budget";

describe("clampNumber / snapToStep", () => {
  test("clampNumber bounds within [lo, hi]", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(99, 0, 10)).toBe(10);
  });
  test("snapToStep rounds to the nearest step", () => {
    expect(snapToStep(120)).toBe(100); // step 50
    expect(snapToStep(125)).toBe(150);
    expect(snapToStep(333, 100)).toBe(300);
  });
});

describe("normalizeBudgetRange", () => {
  test("snaps both handles and keeps them inside the valid bounds", () => {
    const { min, max } = normalizeBudgetRange(133, 4880);
    expect(min).toBe(150);
    expect(max).toBe(4900);
    expect(min).toBeGreaterThanOrEqual(BUDGET_MIN);
    expect(max).toBeLessThanOrEqual(BUDGET_MAX);
  });

  test("enforces at least the minimum gap between min and max", () => {
    const { min, max } = normalizeBudgetRange(1000, 1000);
    expect(max - min).toBeGreaterThanOrEqual(BUDGET_MIN_GAP);
  });

  test("clamps out-of-range input to the slider bounds", () => {
    const low = normalizeBudgetRange(-500, -100);
    expect(low.min).toBe(BUDGET_MIN);
    expect(low.max).toBe(BUDGET_MIN + BUDGET_MIN_GAP);

    const high = normalizeBudgetRange(99999, 99999);
    expect(high.max).toBe(BUDGET_MAX);
    expect(high.min).toBe(BUDGET_MAX - BUDGET_MIN_GAP);
  });
});

describe("priceBucketFromRange", () => {
  test("the full span is the 'all' bucket", () => {
    expect(priceBucketFromRange(BUDGET_MIN, BUDGET_MAX)).toBe("all");
    expect(priceBucketFromRange(50, 6000)).toBe("all"); // wider than bounds
  });
  test("buckets by the upper bound", () => {
    expect(priceBucketFromRange(100, 500)).toBe("100-500");
    expect(priceBucketFromRange(100, 900)).toBe("500-1000");
    expect(priceBucketFromRange(100, 2000)).toBe("1000-2000");
    expect(priceBucketFromRange(100, 4000)).toBe("2000-5000");
    expect(priceBucketFromRange(200, 4999)).toBe("2000-5000");
  });
  test("above the top bound falls into 5000+", () => {
    expect(priceBucketFromRange(200, 8000)).toBe("5000+");
  });
});

describe("normalizeOption", () => {
  const OPTS = ["Forearm", "Upper Arm", "Back"];
  test("canonicalizes case-insensitively to a valid option", () => {
    expect(normalizeOption(OPTS, "forearm")).toBe("Forearm");
    expect(normalizeOption(OPTS, "UPPER ARM")).toBe("Upper Arm");
  });
  test("returns 'none' for unknown, empty, or missing values", () => {
    expect(normalizeOption(OPTS, "ankle")).toBe("none");
    expect(normalizeOption(OPTS, "")).toBe("none");
    expect(normalizeOption(OPTS)).toBe("none");
  });
});
