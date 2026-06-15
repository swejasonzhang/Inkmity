import { describe, test, expect } from "@jest/globals";
import { computeArtistTier } from "@/lib/artistTier";

describe("computeArtistTier", () => {
  test("a brand-new artist is Rising and not verified", () => {
    const t = computeArtistTier(0, 0);
    expect(t.key).toBe("rising");
    expect(t.verified).toBe(false);
  });

  test("10 bookings reaches Established (verified), rating no longer gates", () => {
    const t = computeArtistTier(10, 0);
    expect(t.key).toBe("established");
    expect(t.verified).toBe(true);
  });

  test("advances on bookings alone (no rating requirement)", () => {
    expect(computeArtistTier(25, 0).key).toBe("pro");
    expect(computeArtistTier(50, 0).key).toBe("elite");
    expect(computeArtistTier(9, 5.0).key).toBe("rising");
  });

  test("elite at 50 bookings regardless of rating", () => {
    expect(computeArtistTier(50, 0).key).toBe("elite");
    expect(computeArtistTier(49, 5.0).key).toBe("pro");
  });
});
