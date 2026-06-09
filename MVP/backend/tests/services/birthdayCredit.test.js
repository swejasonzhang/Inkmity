import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockCredit = { create: jest.fn(), find: jest.fn() };
const mockClient = { findOne: jest.fn() };

jest.unstable_mockModule("../../models/Credit.js", () => ({ default: mockCredit }));
jest.unstable_mockModule("../../models/Client.js", () => ({ default: mockClient }));

const { maybeGrantBirthdayCredit } = await import("../../services/creditsService.js");

function clientWithDob(monthOffsetToday, opts = {}) {
  const now = new Date();
  const dob = new Date(
    Date.UTC(
      2000,
      monthOffsetToday ? (now.getUTCMonth() + 1) % 12 : now.getUTCMonth(),
      monthOffsetToday ? 15 : now.getUTCDate()
    )
  );
  return {
    clerkId: "c1",
    dob,
    lastBirthdayCreditYear: opts.lastYear,
    save: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => jest.clearAllMocks());

describe("maybeGrantBirthdayCredit", () => {
  test("grants a birthday credit when today is the birthday", async () => {
    const client = clientWithDob(false);
    mockClient.findOne.mockResolvedValue(client);
    mockCredit.create.mockResolvedValue({ _id: "x" });

    const granted = await maybeGrantBirthdayCredit("c1");

    expect(granted).toBe(true);
    expect(mockCredit.create).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "birthday", amountCents: 1500 })
    );
    expect(client.lastBirthdayCreditYear).toBe(new Date().getUTCFullYear());
  });

  test("does nothing when today is not the birthday", async () => {
    mockClient.findOne.mockResolvedValue(clientWithDob(true));
    expect(await maybeGrantBirthdayCredit("c1")).toBe(false);
    expect(mockCredit.create).not.toHaveBeenCalled();
  });

  test("does not grant twice in the same year", async () => {
    mockClient.findOne.mockResolvedValue(
      clientWithDob(false, { lastYear: new Date().getUTCFullYear() })
    );
    expect(await maybeGrantBirthdayCredit("c1")).toBe(false);
    expect(mockCredit.create).not.toHaveBeenCalled();
  });

  test("does nothing without a dob", async () => {
    mockClient.findOne.mockResolvedValue({ clerkId: "c1", save: jest.fn() });
    expect(await maybeGrantBirthdayCredit("c1")).toBe(false);
  });
});
