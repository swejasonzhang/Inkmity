// In-memory cache implementation (can be replaced with Redis for production scaling)
class Cache {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.store = new Map();
    this.timers = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    this.store.set(key, { value, expiresAt, setAt: Date.now() });

    // Set timer to auto-delete expired entries
    if (expiresAt) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
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

  /**
   * Clean expired entries
   * @returns {number} - Number of entries cleaned
   */
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

// Singleton instance
const cache = new Cache();

// Cache helper functions following DRY principle
export const cacheHelpers = {
  /**
   * Generate cache key from pattern and params
   * @param {string} pattern - Cache key pattern
   * @param {object} params - Parameters to interpolate
   * @returns {string} - Generated cache key
   */
  generateKey(pattern, params = {}) {
    let key = pattern;
    for (const [k, v] of Object.entries(params)) {
      key = key.replace(`:${k}`, String(v));
    }
    return key;
  },

  /**
   * Cache wrapper for async functions
   * @param {Function} fn - Async function to cache
   * @param {string} keyPattern - Cache key pattern
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Function} - Cached function
   */
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

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Cache key pattern to match
   * @returns {number} - Number of keys invalidated
   */
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
