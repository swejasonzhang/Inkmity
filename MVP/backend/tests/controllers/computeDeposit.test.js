import { computeDepositCents } from "../../controllers/bookingController.js";

const policy = (deposit) => ({ deposit });

describe("computeDepositCents (deposit policy → deposit amount)", () => {
  test("percent: takes the percentage of the price", () => {
    const p = policy({ mode: "percent", percent: 0.2, minCents: 5000, maxCents: 30000 });
    // 20% of $400 = $80, inside the $50–$300 range
    expect(computeDepositCents(p, 40000, "tattoo_session")).toBe(8000);
  });

  test("percent: applies the minimum floor", () => {
    const p = policy({ mode: "percent", percent: 0.05, minCents: 5000, maxCents: 30000 });
    // 5% of $400 = $20 → floored to the $50 minimum
    expect(computeDepositCents(p, 40000, "tattoo_session")).toBe(5000);
  });

  test("percent: applies the maximum cap", () => {
    const p = policy({ mode: "percent", percent: 0.5, minCents: 5000, maxCents: 10000 });
    // 50% of $400 = $200 → capped at the $100 maximum
    expect(computeDepositCents(p, 40000, "tattoo_session")).toBe(10000);
  });

  test("flat: charges the flat amount", () => {
    const p = policy({ mode: "flat", amountCents: 10000 });
    expect(computeDepositCents(p, 40000, "tattoo_session")).toBe(10000);
  });

  test("tattoo session enforces a $50 floor regardless of policy", () => {
    const p = policy({ mode: "flat", amountCents: 3000 });
    expect(computeDepositCents(p, 40000, "tattoo_session")).toBe(5000);
  });

  test("consultations are free by default", () => {
    const p = policy({ mode: "percent", percent: 0.2, minCents: 5000, maxCents: 30000 });
    expect(computeDepositCents(p, 40000, "consultation")).toBe(0);
  });

  test("consultations charge the policy when the artist disables free consultations", () => {
    const p = policy({ mode: "percent", percent: 0.2, minCents: 5000, maxCents: 30000, consultationFree: false });
    // 20% of $400 = $80 (no tattoo $50 floor on consultations)
    expect(computeDepositCents(p, 40000, "consultation")).toBe(8000);
  });

  test("missing/empty policy falls back without crashing", () => {
    expect(computeDepositCents({}, 40000, "tattoo_session")).toBeGreaterThanOrEqual(0);
    expect(computeDepositCents(null, 40000, "consultation")).toBe(0);
  });
});
