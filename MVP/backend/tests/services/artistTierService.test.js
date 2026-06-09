import { describe, test, expect } from "@jest/globals";
import {
  computeArtistTier,
  tierRankAggExpr,
} from "../../services/artistTierService.js";

describe("computeArtistTier", () => {
  test("new artist is rising, not verified, standard payouts", () => {
    const t = computeArtistTier(0, 0);
    expect(t.key).toBe("rising");
    expect(t.verified).toBe(false);
    expect(t.payoutSpeed).toBe("standard");
  });

  test("needs both bookings and rating to advance", () => {
    expect(computeArtistTier(50, 3.9).key).toBe("rising");
    expect(computeArtistTier(9, 5).key).toBe("rising");
  });

  test("pro gets two_day payouts, elite gets instant", () => {
    expect(computeArtistTier(50, 4.5).payoutSpeed).toBe("two_day");
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
