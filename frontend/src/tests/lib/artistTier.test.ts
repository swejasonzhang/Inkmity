import { describe, test, expect } from "@jest/globals";
import { computeArtistTier } from "@/lib/artistTier";

describe("computeArtistTier", () => {
  test("a brand-new artist is Rising and not verified", () => {
    const t = computeArtistTier(0, 0);
    expect(t.key).toBe("rising");
    expect(t.verified).toBe(false);
  });

  test("10 bookings at 4.0 reaches Established (verified)", () => {
    const t = computeArtistTier(10, 4.0);
    expect(t.key).toBe("established");
    expect(t.verified).toBe(true);
  });

  test("needs BOTH bookings and rating to advance", () => {
    expect(computeArtistTier(50, 3.9).key).toBe("rising");
    expect(computeArtistTier(9, 5.0).key).toBe("rising");
  });

  test("elite requires 150 bookings and 4.8 rating", () => {
    expect(computeArtistTier(150, 4.8).key).toBe("elite");
    expect(computeArtistTier(150, 4.7).key).toBe("pro");
  });
});
