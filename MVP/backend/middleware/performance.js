// Performance monitoring middleware
export const performanceMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  // Store original end function
  const originalEnd = res.end.bind(res);

  // Override end function to capture metrics
  res.end = function (chunk, encoding) {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
    };

    // Log performance metrics (can be sent to monitoring service in production)
    if (duration > 1000) { // Log slow requests (>1s)
      console.warn(`[PERFORMANCE] Slow request detected:`, {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        memoryDelta: {
          rss: `${(memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        },
      });
    }

    // Add performance headers (optional)
    res.setHeader("X-Response-Time", `${duration.toFixed(2)}ms`);
    res.setHeader("X-Memory-Delta", `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);

    // Call original end
    originalEnd(chunk, encoding);
  };

  next();
};

// Query performance monitoring helper
export const measureQuery = async (queryName, queryFn) => {
  const startTime = process.hrtime.bigint();
  try {
    const result = await queryFn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000;

    if (duration > 500) { // Log slow queries (>500ms)
      console.warn(`[QUERY] Slow query detected:`, {
        name: queryName,
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000;
    console.error(`[QUERY] Query failed:`, {
      name: queryName,
      duration: `${duration.toFixed(2)}ms`,
      error: error.message,
    });
    throw error;
  }
};
