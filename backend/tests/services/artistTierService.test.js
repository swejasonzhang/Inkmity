import { describe, test, expect } from "@jest/globals";
import {
  computeArtistTier,
  tierRankAggExpr,
} from "../../services/artistTierService.js";

describe("computeArtistTier", () => {
  test("new artist is rising, not verified", () => {
    const t = computeArtistTier(0, 0);
    expect(t.key).toBe("rising");
    expect(t.verified).toBe(false);
  });

  test("needs both bookings and rating to advance", () => {
    expect(computeArtistTier(50, 3.9).key).toBe("rising");
    expect(computeArtistTier(9, 5).key).toBe("rising");
  });

  test("instant payouts are free for every tier", () => {
    expect(computeArtistTier(0, 0).payoutSpeed).toBe("instant");
    expect(computeArtistTier(10, 4.0).payoutSpeed).toBe("instant");
    expect(computeArtistTier(50, 4.5).payoutSpeed).toBe("instant");
    expect(computeArtistTier(150, 4.8).payoutSpeed).toBe("instant");
  });
});

describe("tierRankAggExpr", () => {
  test("produces a $switch with a branch per non-base tier", () => {
    const expr = tierRankAggExpr();
    expect(expr.$switch).toBeTruthy();
    expect(expr.$switch.branches.length).toBe(3);
    expect(expr.$switch.default).toBe(0);
  });
});
