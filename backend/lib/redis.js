import Redis from "ioredis";

let client = null;
let initialized = false;

function buildClient(label) {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const c = new Redis(url, {
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

export function getRedis() {
  if (initialized) return client;
  initialized = true;
  client = buildClient("client");
  return client;
}

export function createRedisPubSub() {
  if (!isRedisEnabled()) return null;
  const pub = buildClient("pub");
  const sub = buildClient("sub");
  if (!pub || !sub) return null;
  return { pub, sub };
}
