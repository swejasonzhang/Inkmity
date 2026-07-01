import process from "node:process";

const ENV = process.env.NODE_ENV || "development";

const REQUIRED = [
  "MONGO_URI",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "APP_URL",
];

const missing = REQUIRED.filter((key) => !process.env[key]);

const hasCloudinary =
  !!process.env.CLOUDINARY_URL ||
  (!!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET);
if (!hasCloudinary) missing.push("CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)");
if (missing.length > 0) {
  console.warn(`Missing required environment variables: ${missing.join(", ")}`);
  console.warn("Using placeholder values for development...");
}

import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import pinoHttp from "pino-http";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import { logger } from "./lib/logger.js";

import authRoutes from "./routes/auth.js";
import { getSitemap } from "./controllers/sitemapController.js";
import bookingRoutes from "./routes/bookings.js";
import userRoutes from "./routes/users.js";
import billingRoutes from "./routes/billing.js";
import messageRoutes from "./routes/messages.js";
import availabilityRoutes from "./routes/availability.js";
import imageRoutes from "./routes/images.js";
import dashboardRoutes from "./routes/dashboard.js";
import artistPolicyRoutes from "./routes/artistPolicy.js";
import reviewRoutes from "./routes/reviews.js";
import connectRoutes from "./routes/connect.js";
import rewardsRoutes from "./routes/rewards.js";
import studioRoutes from "./routes/studios.js";
import documentRoutes from "./routes/documents.js";
import waitlistRoutes from "./routes/waitlist.js";
import sketchRoutes from "./routes/sketches.js";
import artworkRoutes from "./routes/artworks.js";
import assistantRoutes from "./routes/assistant.js";
import reportRoutes from "./routes/reports.js";
import internalRoutes from "./routes/internal.js";
import { startRetentionScheduler } from "./services/retentionScheduler.js";
import { mountStripeWebhook } from "./controllers/billingController.js";
import { apiLimiter, authLimiter, assistantLimiter } from "./middleware/rateLimiter.js";
import { initSocket } from "./services/socketService.js";
import { missingConfig } from "./config/index.js";

const isProd = ENV === "production";

if (isProd) {
  const prodMissing = [...missingConfig()];
  if (!process.env.APP_URL) prodMissing.push("APP_URL");
  if (prodMissing.length > 0) {
    console.error(
      `[fatal] Missing required production env vars: ${prodMissing.join(", ")}`
    );
    process.exit(1);
  }
}

const app = express();
app.set("trust proxy", 1);
const server = createServer(app);

mountStripeWebhook(app);

const frontendOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: frontendOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // With >1 instance and no sticky sessions, the HTTP long-polling handshake
  // would bounce across instances. Forcing websocket-only avoids that. Off by
  // default (single instance); enable via SOCKET_WS_ONLY when scaling out.
  ...(process.env.SOCKET_WS_ONLY === "true" ? { transports: ["websocket"] } : {}),
});

initSocket(io);

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/" },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: frontendOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));

app.use(apiLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ service: "inkmity-api", status: "ok", health: "/health" });
});

app.get("/sitemap.xml", getSitemap);

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: ENV,
    version: "1.0.0",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.use("/auth", authLimiter, authRoutes);
app.use("/bookings", bookingRoutes);
app.use("/users", userRoutes);
app.use("/billing", billingRoutes);
app.use("/messages", messageRoutes);
app.use("/availability", availabilityRoutes);
app.use("/images", imageRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/artist-policy", artistPolicyRoutes);
app.use("/reviews", reviewRoutes);
app.use("/connect", connectRoutes);
app.use("/rewards", rewardsRoutes);
app.use("/studios", studioRoutes);
app.use("/documents", documentRoutes);
app.use("/waitlist", waitlistRoutes);
app.use("/sketches", sketchRoutes);
app.use("/artworks", artworkRoutes);
app.use("/assistant", assistantLimiter, assistantRoutes);
app.use("/reports", reportRoutes);
app.use("/internal", internalRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, _next) => {
  (req.log || logger).error({ err }, "Unhandled request error");
  res.status(500).json({
    error: "Internal server error",
    message: ENV === "development" ? err.message : undefined
  });
});

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    if (process.env.MONGO_URI) {
      mongoose.set("strictQuery", true);
      await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: Number(process.env.MONGO_MAX_POOL || 20),
        minPoolSize: Number(process.env.MONGO_MIN_POOL || 2),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ MongoDB connected");
    } else if (isProd) {
      throw new Error("MONGO_URI is required in production");
    } else {
      console.warn("⚠️  MONGO_URI not set, running without database");
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
      console.log(`🔗 API: http://localhost:${PORT}`);
      console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
      if (mongoose.connection.readyState === 1) startRetentionScheduler();
    });
  } catch (error) {
    if (isProd) {
      console.error("[fatal] Database connection failed:", error.message);
      process.exit(1);
    }

    console.warn("⚠️  Database connection failed, starting server anyway:", error.message);
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (without database)`);
      console.log(`📱 Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
      console.log(`🔗 API: http://localhost:${PORT}`);
    });
  }
}

startServer();

function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    mongoose.connection
      .close(false)
      .catch((e) => console.error("Error closing MongoDB:", e?.message || e))
      .finally(() => process.exit(0));
  });
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
  Sentry.captureException(reason);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  Sentry.captureException(err);
  Sentry.close(2000).finally(() => process.exit(1));
});

export { app, io };