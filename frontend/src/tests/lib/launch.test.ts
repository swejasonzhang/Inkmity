import { describe, test, expect } from "@jest/globals";
import { isTestingMode, resolvePreviewAccess, decidePreviewAccess } from "@/lib/launch";

const CODE = "inkmity-vip-2026";
const gate = (over: Partial<Parameters<typeof decidePreviewAccess>[0]> = {}) =>
  decidePreviewAccess({
    isTestingMode: true,
    previewCode: CODE,
    storedCode: null,
    href: "https://inkmity.com/",
    ...over,
  });

describe("decidePreviewAccess", () => {
  test("outside testing mode, everyone is granted", () => {
    expect(decidePreviewAccess({ isTestingMode: false, previewCode: CODE, storedCode: null, href: "https://x/" }))
      .toEqual({ granted: true });
  });

  test("blocks a visitor with no code and nothing stored", () => {
    expect(gate()).toEqual({ granted: false });
  });

  test("unlocks on the correct ?preview= code, and asks to persist it + strip it from the URL", () => {
    const d = gate({ href: "https://inkmity.com/explore?preview=inkmity-vip-2026&ref=ig" });
    expect(d.granted).toBe(true);
    expect(d.store).toBe(CODE);
    // the secret is removed, the unrelated param survives
    expect(d.cleanUrl).toBe("/explore?ref=ig");
  });

  test("rejects an incorrect ?preview= code without persisting anything", () => {
    const d = gate({ href: "https://inkmity.com/?preview=wrong" });
    expect(d.granted).toBe(false);
    expect(d.store).toBeUndefined();
  });

  test("re-admits a returning visitor whose stored code matches", () => {
    expect(gate({ storedCode: CODE }).granted).toBe(true);
  });

  test("a stale stored code that no longer matches is denied", () => {
    expect(gate({ storedCode: "old-code" }).granted).toBe(false);
  });

  test("an empty configured code never grants via a stored value", () => {
    expect(gate({ previewCode: "", storedCode: "" }).granted).toBe(false);
  });

  test("a malformed href fails closed", () => {
    expect(gate({ href: "::::not a url" })).toEqual({ granted: false });
  });
});

describe("launch module (live mode in the test env)", () => {
  test("is not in testing mode and grants access unconditionally", () => {
    expect(isTestingMode).toBe(false);
    expect(resolvePreviewAccess()).toBe(true);
  });
});
