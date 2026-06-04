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
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/inkmity',
  },

  auth: {
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    currency: 'usd',
    testMode: process.env.STRIPE_TEST_MODE === 'true',
    testMinAmountCents: 50,
  },

  // Marketplace platform fee taken from the client (collected as the Stripe
  // Connect application fee on the deposit). fee = max(round(price * pct), minCents).
  platformFee: {
    pct: Number(process.env.PLATFORM_FEE_PCT ?? 0.10),
    minCents: Number(process.env.PLATFORM_FEE_MIN_CENTS ?? 500),
  },

  // Milestone rewards: a client's completed-booking count maps to a reduced
  // platform-fee rate. Ordered ascending by `bookings` threshold.
  rewards: {
    tiers: [
      { key: 'bronze', label: 'Bronze', bookings: 0, feePct: 0.10 },
      { key: 'silver', label: 'Silver', bookings: 3, feePct: 0.08 },
      { key: 'gold', label: 'Gold', bookings: 8, feePct: 0.06 },
      { key: 'platinum', label: 'Platinum', bookings: 15, feePct: 0.05 },
    ],
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.FROM_EMAIL || 'Inkmity <onboarding@resend.dev>',
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
      tattooMinimum: 5000,
      cancellationHoursThreshold: 48,
    },

    bookingCode: {
      length: 6,
      chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    },
  },

  cache: {
    ttl: {
      user: 300,
      booking: 60,
      availability: 300, 
    },
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },

  upload: {
    maxSize: 10 * 1024 * 1024,
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