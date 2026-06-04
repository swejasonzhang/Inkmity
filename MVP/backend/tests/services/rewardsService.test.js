import { tierForCount, nextTierForCount } from "../../services/rewardsService.js";
import { config } from "../../config/index.js";

describe("rewardsService — milestone tiers", () => {
  const tiers = config.rewards.tiers;
  const top = tiers[tiers.length - 1];

  test("a brand-new client is in the base (lowest) tier", () => {
    const t = tierForCount(0);
    expect(t.key).toBe(tiers[0].key);
    expect(t.feePct).toBe(tiers[0].feePct);
  });

  test("crossing a threshold promotes to the matching tier", () => {
    for (const tier of tiers) {
      expect(tierForCount(tier.bookings).key).toBe(
        tier.key
      );
    }
  });

  test("counts between thresholds keep the lower tier", () => {
    if (tiers.length >= 2) {
      const justBelowSecond = tiers[1].bookings - 1;
      expect(tierForCount(justBelowSecond).key).toBe(tiers[0].key);
    }
  });

  test("the fee rate never increases as bookings grow", () => {
    let prev = Infinity;
    for (let n = 0; n <= top.bookings + 5; n++) {
      const pct = tierForCount(n).feePct;
      expect(pct).toBeLessThanOrEqual(prev);
      prev = pct;
    }
  });

  test("nextTierForCount returns the upcoming tier, then null at the top", () => {
    expect(nextTierForCount(0)?.key).toBe(tiers[1]?.key);
    expect(nextTierForCount(top.bookings)).toBeNull();
  });
});
