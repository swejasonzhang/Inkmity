export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment processing failed', code = 'PAYMENT_ERROR') {
    super(message, 402, 'PAYMENT_ERROR');
  }
}

export class BookingError extends AppError {
  constructor(message, code = 'BOOKING_ERROR') {
    super(message, 400, code);
  }
}

export class StripeError extends AppError {
  constructor(message, stripeError = null) {
    super(message, 402, 'STRIPE_ERROR');
    this.stripeError = stripeError;
  }
}

export function handleDatabaseError(error) {
  console.error('Database error:', error);

  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map(err => err.message);
    return new ValidationError('Validation failed', details);
  }

  if (error.name === 'CastError') {
    return new ValidationError('Invalid ID format');
  }

  if (error.code === 11000) {
    return new ConflictError('Duplicate entry');
  }

  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
}

export function handleStripeError(error) {
  console.error('Stripe error:', error);

  switch (error.type) {
    case 'card_error':
      return new PaymentError(error.message);
    case 'invalid_request_error':
      return new ValidationError(error.message);
    case 'authentication_error':
      return new AppError('Payment service unavailable', 503, 'SERVICE_UNAVAILABLE');
    case 'api_connection_error':
    case 'api_error':
      return new AppError('Payment service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
    default:
      return new StripeError(error.message || 'Payment failed', error);
  }
}

export function createErrorResponse(error, includeStack = false) {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
  };

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  if (error.details) {
    response.error.details = error.details;
  }

  return response;
}