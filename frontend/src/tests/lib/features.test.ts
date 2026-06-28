import { describe, test, expect } from "@jest/globals";
import { STUDIOS_ENABLED } from "@/lib/features";

describe("features", () => {
  test("studios are disabled by default", () => {
    expect(STUDIOS_ENABLED).toBe(false);
  });
});
