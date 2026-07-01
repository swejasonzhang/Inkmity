import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";

const mockRunTick = jest.fn();

jest.unstable_mockModule("../../services/retentionService.js", () => ({
  runRetentionTick: mockRunTick,
}));
jest.unstable_mockModule("../../lib/logger.js", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { startRetentionScheduler, stopRetentionScheduler } = await import(
  "../../services/retentionScheduler.js"
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  delete process.env.RETENTION_SCHEDULER;
  mockRunTick.mockResolvedValue({ reminders: 0, aftercare: 0, rebook: 0 });
});

afterEach(() => {
  stopRetentionScheduler();
  jest.useRealTimers();
});

describe("retention scheduler", () => {
  test("runs a tick on each interval", async () => {
    startRetentionScheduler({ intervalMs: 1000 });
    expect(mockRunTick).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockRunTick).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000);
    expect(mockRunTick).toHaveBeenCalledTimes(3);
  });

  test("is idempotent to start — a second call does not add a second timer", async () => {
    startRetentionScheduler({ intervalMs: 1000 });
    startRetentionScheduler({ intervalMs: 1000 });
    await jest.advanceTimersByTimeAsync(1000);
    expect(mockRunTick).toHaveBeenCalledTimes(1);
  });

  test("does not start when RETENTION_SCHEDULER=off", async () => {
    process.env.RETENTION_SCHEDULER = "off";
    const handle = startRetentionScheduler({ intervalMs: 1000 });
    expect(handle).toBeNull();
    await jest.advanceTimersByTimeAsync(5000);
    expect(mockRunTick).not.toHaveBeenCalled();
  });

  test("a throwing tick does not stop future ticks", async () => {
    mockRunTick.mockRejectedValueOnce(new Error("blip"));
    startRetentionScheduler({ intervalMs: 1000 });

    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);
    expect(mockRunTick).toHaveBeenCalledTimes(2);
  });

  test("stops cleanly", async () => {
    startRetentionScheduler({ intervalMs: 1000 });
    await jest.advanceTimersByTimeAsync(1000);
    stopRetentionScheduler();
    await jest.advanceTimersByTimeAsync(5000);
    expect(mockRunTick).toHaveBeenCalledTimes(1);
  });
});
