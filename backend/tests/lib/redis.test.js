import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";

describe("lib/redis (disabled / single-instance fallback)", () => {
  let prev;
  beforeEach(() => {
    prev = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prev;
  });

  test("isRedisEnabled is false and the getters return null without REDIS_URL", async () => {
    const { isRedisEnabled, getRedis, createRedisPubSub } = await import("../../lib/redis.js");
    expect(isRedisEnabled()).toBe(false);
    expect(getRedis()).toBeNull();
    expect(createRedisPubSub()).toBeNull();
  });

  test("isRedisEnabled reflects REDIS_URL presence", async () => {
    const { isRedisEnabled } = await import("../../lib/redis.js");
    process.env.REDIS_URL = "redis://localhost:6379";
    expect(isRedisEnabled()).toBe(true);
    delete process.env.REDIS_URL;
    expect(isRedisEnabled()).toBe(false);
  });
});
