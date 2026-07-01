import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockRunTick = jest.fn();

jest.unstable_mockModule("../../services/retentionService.js", () => ({
  runRetentionTick: mockRunTick,
}));
jest.unstable_mockModule("../../config/index.js", () => ({
  config: { internal: { cronSecret: "s3cr3t-value" } },
}));
jest.unstable_mockModule("../../lib/logger.js", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { retentionTick } = await import("../../controllers/retentionController.js");

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}
const reqWithSecret = (secret) => ({
  get: (h) => (h === "x-internal-secret" && secret != null ? secret : undefined),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRunTick.mockResolvedValue({ reminders: 2, aftercare: 1, rebook: 0 });
});

describe("retentionTick endpoint guard", () => {
  test("401s when no secret is provided, without running the tick", async () => {
    const res = mockRes();
    await retentionTick(reqWithSecret(undefined), res);
    expect(res.statusCode).toBe(401);
    expect(mockRunTick).not.toHaveBeenCalled();
  });

  test("401s on a wrong secret", async () => {
    const res = mockRes();
    await retentionTick(reqWithSecret("wrong-value-here"), res);
    expect(res.statusCode).toBe(401);
    expect(mockRunTick).not.toHaveBeenCalled();
  });

  test("runs the tick and returns the counts on the correct secret", async () => {
    const res = mockRes();
    await retentionTick(reqWithSecret("s3cr3t-value"), res);
    expect(mockRunTick).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, reminders: 2, aftercare: 1, rebook: 0 });
  });

  test("500s if the tick throws, and does not leak the error", async () => {
    mockRunTick.mockRejectedValue(new Error("boom"));
    const res = mockRes();
    await retentionTick(reqWithSecret("s3cr3t-value"), res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "retention_failed" });
  });
});
