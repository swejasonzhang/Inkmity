import { AppError, createErrorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  let error = err;

  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => e.message);
    error = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    error.details = details;
  }

  if (err.name === 'CastError') {
    error = new AppError('Invalid data format', 400, 'INVALID_FORMAT');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists`, 409, 'DUPLICATE_ENTRY');
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  if (!(error instanceof AppError)) {
    error = new AppError(
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  const statusCode = error.statusCode || 500;
  const includeStack = process.env.NODE_ENV === 'development';

  res.status(statusCode).json(createErrorResponse(error, includeStack));
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res, next) {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  next(error);
}