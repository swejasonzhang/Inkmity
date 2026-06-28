import { describe, test, expect } from "@jest/globals";
import { isTestingMode, resolvePreviewAccess } from "@/lib/launch";

describe("launch", () => {
  test("is not in testing mode by default (non-prod test env)", () => {
    expect(isTestingMode).toBe(false);
  });

  test("grants preview access when not in testing mode", () => {
    expect(resolvePreviewAccess()).toBe(true);
  });
});
