class Cache {
  constructor(defaultTTL = 300000) {
    this.store = new Map();
    this.timers = new Map();
    this.defaultTTL = defaultTTL;
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    this.store.set(key, { value, expiresAt, setAt: Date.now() });

    if (expiresAt) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.store.delete(key);
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }

  has(key) {
    return this.get(key) !== null;
  }

  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let activeCount = 0;

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      total: this.store.size,
      active: activeCount,
      expired: expiredCount,
      keys: Array.from(this.store.keys()),
    };
  }

  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;
    const toDelete = [];

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => {
      this.delete(key);
      cleaned++;
    });

    return cleaned;
  }
}

const cache = new Cache();

export const cacheHelpers = {
  generateKey(pattern, params = {}) {
    let key = pattern;
    for (const [k, v] of Object.entries(params)) {
      key = key.replace(`:${k}`, String(v));
    }
    return key;
  },

  memoize(fn, keyPattern, ttl = 300000) {
    return async (...args) => {
      const key = cacheHelpers.generateKey(keyPattern, { args: JSON.stringify(args) });
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }
      const result = await fn(...args);
      cache.set(key, result, ttl);
      return result;
    };
  },

  invalidate(pattern) {
    const regex = new RegExp(pattern.replace(/:[^/]+/g, "[^/]+"));
    let invalidated = 0;
    for (const key of cache.store.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  },
};

export default cache;
