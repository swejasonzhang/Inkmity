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

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
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
    baseCents: Number(process.env.PLATFORM_FEE_BASE_CENTS ?? 1000),
    pct: Number(process.env.PLATFORM_FEE_PCT ?? 0.05),
    capCents: Number(process.env.PLATFORM_FEE_CAP_CENTS ?? 5000),
    processingPct: Number(process.env.STRIPE_PROCESSING_PCT ?? 0.029),
    processingFlatCents: Number(process.env.STRIPE_PROCESSING_FLAT_CENTS ?? 30),
  },

  studio: {
    defaultCommissionPct: Number(process.env.STUDIO_DEFAULT_COMMISSION_PCT ?? 0.30),
  },

  booking: {
    maxPriceCents: Number(process.env.MAX_BOOKING_PRICE_CENTS ?? 5_000_000),
    finalPriceReconsentPct: Number(process.env.FINAL_PRICE_RECONSENT_PCT ?? 0.1),
  },

  admin: {
    get clerkIds() {
      return (process.env.ADMIN_CLERK_IDS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    },
  },

  test: {
    get clerkIds() {
      return (process.env.TEST_CLERK_IDS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    },
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
      { key: 'platinum', label: 'Platinum', bookings: 10, feePct: 0.05, loyaltyCreditCents: 5000, waivesBaseFee: true },
    ],
  },

  artistTiers: [
    { key: 'rising', label: 'Rising', bookings: 0, minRating: 0, payoutSpeed: 'instant' },
    { key: 'established', label: 'Established', bookings: 10, minRating: 0, payoutSpeed: 'instant' },
    { key: 'pro', label: 'Pro', bookings: 25, minRating: 0, payoutSpeed: 'instant' },
    { key: 'elite', label: 'Elite', bookings: 50, minRating: 0, payoutSpeed: 'instant' },
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

const REQUIRED_CONFIG = {
  'database.uri': 'MONGO_URI',
  'auth.clerkSecretKey': 'CLERK_SECRET_KEY',
  'stripe.secretKey': 'STRIPE_SECRET_KEY',
  'stripe.webhookSecret': 'STRIPE_WEBHOOK_SECRET',
};

export function missingConfig() {
  return Object.entries(REQUIRED_CONFIG)
    .filter(([path]) => {
      const value = path.split('.').reduce((acc, k) => acc?.[k], config);
      return !value;
    })
    .map(([, envVar]) => envVar);
}

export function validateConfig() {
  const missing = missingConfig();
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