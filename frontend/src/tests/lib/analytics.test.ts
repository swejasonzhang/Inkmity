import { describe, test, expect, afterEach, jest } from "@jest/globals";
import { analyticsEnabled, initAnalytics, trackEvent } from "@/lib/analytics";

afterEach(() => {
  jest.restoreAllMocks();
  delete (window as any).plausible;
});

describe("analytics (no plausible domain configured)", () => {
  test("is disabled without a configured domain", () => {
    expect(analyticsEnabled).toBe(false);
  });

  test("initAnalytics injects no script when disabled", () => {
    const appendSpy = jest.spyOn(document.head, "appendChild");
    initAnalytics();
    expect(appendSpy).not.toHaveBeenCalled();
    expect((window as any).plausible).toBeUndefined();
  });

  test("trackEvent is a no-op when disabled", () => {
    const fn = jest.fn();
    (window as any).plausible = fn;
    trackEvent("signup", { plan: "free" });
    expect(fn).not.toHaveBeenCalled();
  });
});
