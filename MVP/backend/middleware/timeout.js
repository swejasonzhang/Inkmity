export const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: "Request Timeout",
          message: "The request took too long to process",
          requestId: req.requestId,
        });
      }
    }, timeoutMs);

    const originalEnd = res.end;
    res.end = function (...args) {
      clearTimeout(timeout);
      originalEnd.apply(this, args);
    };

    next();
  };
};

