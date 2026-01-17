import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  },

  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/inkmity',
  },

  auth: {
    clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    platformFeeCents: 1000,
    currency: 'usd',
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.FROM_EMAIL || 'noreply@inkmity.com',
    templates: {
      confirmationSubject: 'Appointment Confirmed - Inkmity',
      cancellationSubject: 'Appointment Cancelled - Inkmity',
    },
  },

  business: {
    timezone: 'America/New_York',
    defaultSlotMinutes: 30,
    defaultOpenRanges: [{ start: '10:00', end: '22:00' }],
    weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],

    deposits: {
      defaultPercent: 0.2,
      tattooMinimum: 5000, // $50 minimum for tattoos
      cancellationHoursThreshold: 48,
    },

    bookingCode: {
      length: 6,
      chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    },
  },

  cache: {
    ttl: {
      user: 300, // 5 minutes
      booking: 60, // 1 minute
      availability: 300, // 5 minutes
    },
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

export function validateConfig() {
  const required = [
    'auth.clerkSecretKey',
    'stripe.secretKey',
    'database.uri',
  ];

  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value?.[k];
    }
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Configuration validated successfully');
}

export function isDevelopment() {
  return config.server.nodeEnv === 'development';
}

export function isProduction() {
  return config.server.nodeEnv === 'production';
}

export function isTest() {
  return config.server.nodeEnv === 'test';
}