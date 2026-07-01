import { describe, test, expect } from "@jest/globals";
import { isRole, resolveRole } from "@/lib/role";

describe("isRole", () => {
  test("accepts the three known roles", () => {
    expect(isRole("client")).toBe(true);
    expect(isRole("artist")).toBe(true);
    expect(isRole("studio")).toBe(true);
  });

  test("rejects anything else", () => {
    for (const v of ["admin", "", "Artist", undefined, null, 3, {}]) {
      expect(isRole(v)).toBe(false);
    }
  });
});

describe("resolveRole", () => {
  test("trusts a valid API role, including client", () => {
    expect(resolveRole("artist", undefined)).toBe("artist");
    expect(resolveRole("studio", "client")).toBe("studio");
    expect(resolveRole("client", "artist")).toBe("client");
  });

  test("falls back to Clerk metadata when the API role is missing/invalid", () => {
    expect(resolveRole(undefined, "artist")).toBe("artist");
    expect(resolveRole(null, "studio")).toBe("studio");
    expect(resolveRole("bogus", "artist")).toBe("artist");
  });

  test("only honours artist/studio from metadata; everything else defaults to client", () => {
    expect(resolveRole(null, "client")).toBe("client");
    expect(resolveRole(null, "admin")).toBe("client");
    expect(resolveRole(null, undefined)).toBe("client");
    expect(resolveRole(null, "")).toBe("client");
  });

  test("with neither source, defaults to the safe client role", () => {
    expect(resolveRole(undefined, undefined)).toBe("client");
  });
});
