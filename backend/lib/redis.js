import Redis from "ioredis";

// Shared Redis access for cross-instance state (Socket.io adapter, cache,
// rate limiting). When REDIS_URL is unset (local dev, tests, single-instance
// deploys) every getter returns null and callers fall back to in-memory
// behavior — so nothing here changes single-instance operation.

let client = null;
let initialized = false;

function buildClient(label) {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const c = new Redis(url, {
    // Fail fast instead of queueing forever when Redis is unreachable, so a
    // Redis outage degrades to a DB read rather than hanging requests.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  c.on("error", (e) => console.error(`[redis:${label}] ${e.message}`));
  return c;
}

export function isRedisEnabled() {
  return Boolean(process.env.REDIS_URL);
}

// Singleton client for cache + rate limiting.
export function getRedis() {
  if (initialized) return client;
  initialized = true;
  client = buildClient("client");
  return client;
}

// Fresh pub/sub pair for the Socket.io adapter (each needs its own connection).
export function createRedisPubSub() {
  if (!isRedisEnabled()) return null;
  const pub = buildClient("pub");
  const sub = buildClient("sub");
  if (!pub || !sub) return null;
  return { pub, sub };
}
