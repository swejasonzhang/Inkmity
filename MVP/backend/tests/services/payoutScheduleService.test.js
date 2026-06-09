import { describe, test, expect } from "@jest/globals";
import { payoutScheduleForSpeed } from "../../services/payoutScheduleService.js";

describe("payoutScheduleForSpeed", () => {
  test("standard pays out on a slower daily schedule", () => {
    expect(payoutScheduleForSpeed("standard")).toEqual({
      interval: "daily",
      delay_days: 7,
    });
  });

  test("two_day (Pro) pays out in 2 days", () => {
    expect(payoutScheduleForSpeed("two_day")).toEqual({
      interval: "daily",
      delay_days: 2,
    });
  });

  test("instant (Elite) uses the minimum payout delay", () => {
    expect(payoutScheduleForSpeed("instant")).toEqual({
      interval: "daily",
      delay_days: "minimum",
    });
  });

  test("unknown speed falls back to standard", () => {
    expect(payoutScheduleForSpeed("whatever").delay_days).toBe(7);
  });
});
