import { ZodError } from "zod";
import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || "unknown";
  
  logger.error("Request error", {
    requestId,
    path: req.originalUrl,
    method: req.method,
    error: err.message,
    stack: err.stack,
    status: err.status || err.statusCode || 500,
    body: process.env.NODE_ENV === "development" ? req.body : undefined,
    query: req.query,
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid request data",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
      requestId,
    });
  }

  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode;
    return res.status(status).json({
      error: err.message || "Request failed",
      requestId,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  if (err.name === "MongoServerError" || err.name === "MongooseError") {
    return res.status(500).json({
      error: "Database error",
      message: "An error occurred while processing your request",
      requestId,
    });
  }

  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" 
      ? "An unexpected error occurred" 
      : err.message,
    requestId,
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
