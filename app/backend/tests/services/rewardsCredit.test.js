import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockClient = { findOne: jest.fn() };
const mockGrant = jest.fn();

jest.unstable_mockModule("../../models/Client.js", () => ({ default: mockClient }));
jest.unstable_mockModule("../../services/creditsService.js", () => ({
  grantCredit: mockGrant,
}));

const { recordCompletedBooking } = await import("../../services/rewardsService.js");

function clientAt(count) {
  return {
    clerkId: "c1",
    completedBookingsCount: count,
    rewardsTier: "bronze",
    save: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => jest.clearAllMocks());

describe("loyalty credit on tier-up", () => {
  test("grants Silver credit when crossing to the 3rd booking", async () => {
    mockClient.findOne.mockResolvedValue(clientAt(2));
    await recordCompletedBooking("c1");
    expect(mockGrant).toHaveBeenCalledWith("c1", 1000, "loyalty_tier", expect.anything());
  });

  test("grants Gold credit at the 8th booking", async () => {
    mockClient.findOne.mockResolvedValue(clientAt(7));
    await recordCompletedBooking("c1");
    expect(mockGrant).toHaveBeenCalledWith("c1", 2500, "loyalty_tier", expect.anything());
  });

  test("crossing into Gold also grants a consultation credit", async () => {
    mockClient.findOne.mockResolvedValue(clientAt(7));
    await recordCompletedBooking("c1");
    expect(mockGrant).toHaveBeenCalledWith("c1", 2500, "consultation", expect.anything());
  });

  test("does not grant within the same tier", async () => {
    mockClient.findOne.mockResolvedValue(clientAt(3)); // 3 -> 4, still Silver
    await recordCompletedBooking("c1");
    expect(mockGrant).not.toHaveBeenCalled();
  });
});
