export const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || "unknown";
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";
  const error = err.error || message;

  if (statusCode >= 500) {
    console.error(`[Error ${statusCode}]`, {
      requestId,
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack,
    });
  } else {
    console.warn(`[Error ${statusCode}]`, {
      requestId,
      path: req.path,
      method: req.method,
      error: err.message,
    });
  }

  if (!res.headersSent) {
    res.status(statusCode).json({
      error,
      message: statusCode >= 500 ? "Internal server error" : message,
      requestId,
    });
  } else {
    next(err);
  }
};