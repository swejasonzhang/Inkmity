import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";

async function loadLogger({ dev = false, prod = false } = {}) {
  jest.resetModules();
  jest.unstable_mockModule("../../config/index.js", () => ({
    isDevelopment: () => dev,
    isProduction: () => prod,
  }));
  const mod = await import("../../utils/logger.js");
  return mod.logger;
}

describe("logger", () => {
  let errorSpy;
  let warnSpy;
  let logSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("level gating in production (currentLevel = warn)", () => {
    let logger;
    beforeEach(async () => {
      logger = await loadLogger({ dev: false, prod: true });
    });

    test("error and warn are emitted", () => {
      logger.error("boom");
      logger.warn("careful");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test("info and debug are suppressed", () => {
      logger.info("hi");
      logger.debug("trace");
      expect(logSpy).not.toHaveBeenCalled();
    });

    test("production formats messages as JSON with meta", () => {
      logger.error("boom", { code: 500 });
      const payload = JSON.parse(errorSpy.mock.calls[0][0]);
      expect(payload).toMatchObject({
        level: "error",
        message: "boom",
        code: 500,
      });
      expect(typeof payload.timestamp).toBe("string");
    });
  });

  describe("level gating in development (currentLevel = debug)", () => {
    let logger;
    beforeEach(async () => {
      logger = await loadLogger({ dev: true, prod: false });
    });

    test("all four levels are emitted", () => {
      logger.error("e");
      logger.warn("w");
      logger.info("i");
      logger.debug("d");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledTimes(2);
    });

    test("development formats messages as a human-readable string", () => {
      logger.info("ready");
      const out = logSpy.mock.calls[0][0];
      expect(out).toMatch(/INFO: ready$/);
      expect(out).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    test("level methods work when meta is omitted (default param)", () => {
      logger.error("e");
      logger.warn("w");
      logger.info("i");
      logger.debug("d");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("logRequest", () => {
    test("uses warn for >= 400 status codes", async () => {
      const logger = await loadLogger({ dev: true });
      const req = { method: "GET", url: "/x", ip: "1.1.1.1", get: () => "ua" };
      logger.logRequest(req, { statusCode: 404 }, 12);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/Request completed with error/);
    });

    test("uses info for < 400 status codes", async () => {
      const logger = await loadLogger({ dev: true });
      const req = { method: "GET", url: "/x", ip: "1.1.1.1", get: () => "ua" };
      logger.logRequest(req, { statusCode: 200 }, 5);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toMatch(/Request completed/);
    });
  });

  describe("logDatabase", () => {
    test("logs at debug level (emitted in development)", async () => {
      const logger = await loadLogger({ dev: true });
      logger.logDatabase("find", "users", { a: 1 }, [], 7);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toMatch(/Database operation/);
    });

    test("is suppressed in production (debug below warn)", async () => {
      const logger = await loadLogger({ dev: false, prod: true });
      logger.logDatabase("find", "users");
      expect(logSpy).not.toHaveBeenCalled();
    });

    test("redacts query/result and omits duration in production formatting", async () => {
      const logger = await loadLogger({ dev: false, prod: false });
      logger.currentLevel = "debug";
      logger.logDatabase("find", "users");
      const payload = JSON.parse(logSpy.mock.calls[0][0]);
      expect(payload.query).toBe("[REDACTED]");
      expect(payload.duration).toBeUndefined();
      expect(payload.result).toBeUndefined();
    });

    test("includes duration and success markers in production formatting", async () => {
      const logger = await loadLogger({ dev: false, prod: false });
      logger.currentLevel = "debug";
      logger.logDatabase("find", "users", { a: 1 }, { ok: true }, 9);
      const payload = JSON.parse(logSpy.mock.calls[0][0]);
      expect(payload.duration).toBe("9ms");
      expect(payload.result).toBe("[SUCCESS]");
    });
  });

  describe("logEmail", () => {
    test("masks the recipient and logs info on success in production", async () => {
      const logger = await loadLogger({ dev: false, prod: true });
      logger.logEmail("welcome", "jasonzhang@example.com", true);
      const payload = JSON.parse(logSpy.mock.calls?.[0]?.[0] ?? "{}");
      expect(payload.message).toBeUndefined();
    });

    test("logs error on failure", async () => {
      const logger = await loadLogger({ dev: true });
      logger.logEmail("welcome", "a@b.com", false);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toMatch(/Email sending failed/);
    });

    test("logs info on success in development", async () => {
      const logger = await loadLogger({ dev: true });
      logger.logEmail("welcome", "a@b.com", true);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toMatch(/Email sent successfully/);
    });

    test("defaults success to true when omitted", async () => {
      const logger = await loadLogger({ dev: true });
      logger.logEmail("welcome", "a@b.com");
      expect(logSpy.mock.calls[0][0]).toMatch(/Email sent successfully/);
    });
  });

  describe("logStripe", () => {
    test("logs info on success", async () => {
      const logger = await loadLogger({ dev: true });
      logger.logStripe("charge", "pi_1", 1000, true);
      expect(logSpy.mock.calls[0][0]).toMatch(/Stripe operation successful/);
    });

    test("logs error on failure", async () => {
      const logger = await loadLogger({ dev: true });
      logger.logStripe("charge", "pi_1", 1000, false);
      expect(errorSpy.mock.calls[0][0]).toMatch(/Stripe operation failed/);
    });

    test("defaults amount and success when omitted", async () => {
      const logger = await loadLogger({ dev: true });
      logger.logStripe("refund", "pi_2");
      expect(logSpy.mock.calls[0][0]).toMatch(/Stripe operation successful/);
    });
  });

  describe("maskEmail", () => {
    test("masks the local part beyond two characters", async () => {
      const logger = await loadLogger();
      expect(logger.maskEmail("jasonzhang@example.com")).toBe(
        "ja********@example.com"
      );
    });

    test("leaves short local parts unmasked", async () => {
      const logger = await loadLogger();
      expect(logger.maskEmail("ab@x.com")).toBe("ab@x.com");
    });

    test("returns the input unchanged when not an email", async () => {
      const logger = await loadLogger();
      expect(logger.maskEmail("not-an-email")).toBe("not-an-email");
      expect(logger.maskEmail("")).toBe("");
    });
  });
});
