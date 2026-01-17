import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config, validateConfig, isDevelopment } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, asyncHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import userRoutes from './routes/users.js';
import billingRoutes from './routes/billing.js';

import { initDatabase } from './config/database.js';
import { initSocketService } from './services/socketService.js';

validateConfig();

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: [config.server.frontendUrl, config.server.backendUrl],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-test-user-id']
}));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });

  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.use('/auth', authRoutes);
app.use('/bookings', bookingRoutes);
app.use('/users', userRoutes);
app.use('/billing', billingRoutes);

app.get('/api', (req, res) => {
  res.json({
    name: 'Inkmity API',
    version: '1.0.0',
    description: 'Appointment booking and payment API for tattoo artists',
    endpoints: {
      auth: '/auth/*',
      bookings: '/bookings/*',
      users: '/users/*',
      billing: '/billing/*'
    }
  });
});

app.use(notFoundHandler);

app.use(errorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error });
  process.exit(1);
});

async function startServer() {
  try {
    await initDatabase();
    logger.info('Database connected successfully');

    const io = initSocketService();
    logger.info('Socket service initialized');
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 Server running on port ${config.server.port}`, {
        environment: config.server.nodeEnv,
        frontendUrl: config.server.frontendUrl
      });
    });

    io.attach(server, {
      cors: {
        origin: config.server.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message });
    process.exit(1);
  }
}

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}