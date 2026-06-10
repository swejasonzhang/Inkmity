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

  platformFee: {
    pct: Number(process.env.PLATFORM_FEE_PCT ?? 0.10),
    minCents: Number(process.env.PLATFORM_FEE_MIN_CENTS ?? 500),
  },

  studio: {
    defaultCommissionPct: Number(process.env.STUDIO_DEFAULT_COMMISSION_PCT ?? 0.30),
  },

  admin: {
    clerkIds: (process.env.ADMIN_CLERK_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  dev: {
    get bypassGates() {
      return (
        process.env.DEV_BYPASS_GATES === "true" &&
        (process.env.NODE_ENV || "development") !== "production"
      );
    },
  },

  rewards: {
    birthdayCreditCents: Number(process.env.BIRTHDAY_CREDIT_CENTS ?? 1500),
    tiers: [
      { key: 'bronze', label: 'Bronze', bookings: 0, feePct: 0.10, loyaltyCreditCents: 0 },
      { key: 'silver', label: 'Silver', bookings: 3, feePct: 0.08, loyaltyCreditCents: 1000 },
      { key: 'gold', label: 'Gold', bookings: 8, feePct: 0.06, loyaltyCreditCents: 2500, consultationCreditCents: 2500 },
      { key: 'platinum', label: 'Platinum', bookings: 15, feePct: 0.05, loyaltyCreditCents: 5000 },
    ],
  },

  artistTiers: [
    { key: 'rising', label: 'Rising', bookings: 0, minRating: 0, payoutSpeed: 'standard' },
    { key: 'established', label: 'Established', bookings: 10, minRating: 4.0, payoutSpeed: 'standard' },
    { key: 'pro', label: 'Pro', bookings: 50, minRating: 4.5, payoutSpeed: 'two_day' },
    { key: 'elite', label: 'Elite', bookings: 150, minRating: 4.8, payoutSpeed: 'instant' },
  ],

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

  account: {
    usernameChangeCooldownDays: Number(process.env.USERNAME_CHANGE_COOLDOWN_DAYS ?? 30),
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