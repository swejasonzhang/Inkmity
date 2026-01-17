import { config, isDevelopment, isProduction } from '../config/index.js';

class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    this.currentLevel = isProduction() ? 'warn' : 'debug';
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.currentLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const baseMessage = {
      timestamp,
      level,
      message,
      ...meta,
    };

    if (isDevelopment()) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }

    return JSON.stringify(baseMessage);
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    if (res.statusCode >= 400) {
      this.warn('Request completed with error', meta);
    } else {
      this.info('Request completed', meta);
    }
  }

  logDatabase(operation, collection, query = {}, result = null, duration = null) {
    const meta = {
      operation,
      collection,
      query: isDevelopment() ? query : '[REDACTED]',
      duration: duration ? `${duration}ms` : undefined,
      result: result ? (isDevelopment() ? result : '[SUCCESS]') : undefined,
    };

    this.debug('Database operation', meta);
  }

  logEmail(type, recipient, success = true) {
    const meta = {
      type,
      recipient: isProduction() ? this.maskEmail(recipient) : recipient,
      success,
    };

    if (success) {
      this.info('Email sent successfully', meta);
    } else {
      this.error('Email sending failed', meta);
    }
  }

  logStripe(operation, paymentIntentId, amount = null, success = true) {
    const meta = {
      operation,
      paymentIntentId,
      amount,
      success,
    };

    if (success) {
      this.info('Stripe operation successful', meta);
    } else {
      this.error('Stripe operation failed', meta);
    }
  }

  maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2
      ? local.substring(0, 2) + '*'.repeat(local.length - 2)
      : local;
    return `${maskedLocal}@${domain}`;
  }
}

export const logger = new Logger();