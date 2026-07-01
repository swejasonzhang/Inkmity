import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import cache, { cacheHelpers } from "../../lib/cache.js";

describe("Cache", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    cache.clear();
  });
  afterEach(() => {
    cache.clear();
    jest.useRealTimers();
  });

  test("returns null for a missing key", () => {
    expect(cache.get("nope")).toBeNull();
    expect(cache.has("nope")).toBe(false);
  });

  test("stores and retrieves a value", () => {
    cache.set("k", 42);
    expect(cache.get("k")).toBe(42);
    expect(cache.has("k")).toBe(true);
  });

  test("ttl of 0 never expires", () => {
    cache.set("k", "v", 0);
    jest.advanceTimersByTime(10_000_000);
    expect(cache.get("k")).toBe("v");
  });

  test("expires once the ttl elapses", () => {
    const t0 = Date.now();
    cache.set("k", "v", 1000);
    expect(cache.get("k")).toBe("v");
    jest.setSystemTime(t0 + 1001);
    expect(cache.get("k")).toBeNull();
    expect(cache.has("k")).toBe(false);
  });

  test("delete removes a key", () => {
    cache.set("k", 1);
    cache.delete("k");
    expect(cache.get("k")).toBeNull();
  });

  test("clear empties everything", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.getStats().total).toBe(0);
  });

  test("getStats reports totals and keys", () => {
    cache.set("active", "v", 10000);
    cache.set("forever", "v", 0);
    const stats = cache.getStats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(2);
    expect(stats.keys).toEqual(expect.arrayContaining(["active", "forever"]));
  });

  test("cleanExpired removes only expired entries and returns the count", () => {
    const t0 = Date.now();
    cache.set("short", "v", 1000);
    cache.set("long", "v", 0);
    jest.setSystemTime(t0 + 2000);
    expect(cache.cleanExpired()).toBe(1);
    expect(cache.getStats().total).toBe(1);
    expect(cache.get("long")).toBe("v");
  });
});

describe("cacheHelpers", () => {
  beforeEach(() => cache.clear());
  afterEach(() => cache.clear());

  test("generateKey substitutes named params", () => {
    expect(cacheHelpers.generateKey("artist::id:profile", { id: 7 })).toBe("artist:7:profile");
  });

  test("memoize caches results per serialized args", async () => {
    const fn = jest.fn(async (a, b) => a + b);
    const memo = cacheHelpers.memoize(fn, "sum::args", 1000);

    expect(await memo(2, 3)).toBe(5);
    expect(await memo(2, 3)).toBe(5);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(await memo(4, 5)).toBe(9);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("invalidate removes keys matching the glob pattern only", () => {
    cache.set("artist:1:profile", "a");
    cache.set("artist:2:profile", "b");
    cache.set("studio:1:info", "c");

    expect(cacheHelpers.invalidate("artist:*:profile")).toBe(2);
    expect(cache.get("artist:1:profile")).toBeNull();
    expect(cache.get("studio:1:info")).toBe("c");
  });

  test("invalidate scopes a trailing wildcard to its prefix, not the whole namespace", () => {
    cache.set("user:featured:5", "f");
    cache.set("user:id:abc", "x");
    cache.set("user:clerkId:k1", "y");

    expect(cacheHelpers.invalidate("user:featured:*")).toBe(1);
    expect(cache.get("user:featured:5")).toBeNull();
    expect(cache.get("user:id:abc")).toBe("x");
    expect(cache.get("user:clerkId:k1")).toBe("y");
  });
});
