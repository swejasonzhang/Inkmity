import { ENV_NAME as ENV } from "./loadEnv.js";
import process from "node:process";

const REQUIRED = [
  "MONGO_URI",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "APP_URL",
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(`Missing required environment variables: ${missing.join(", ")}`);
  console.warn("Using placeholder values for development...");
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
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
import { mountStripeWebhook } from "./controllers/billingController.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { initSocket } from "./services/socketService.js";

const isProd = ENV === "production";

if (isProd) {
  const prodRequired = [
    "MONGO_URI",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "CLERK_SECRET_KEY",
    "APP_URL",
  ];
  const prodMissing = prodRequired.filter((k) => !process.env[k]);
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

const frontendOrigins = process.env.FRONTEND_URL
  ? (Array.isArray(process.env.FRONTEND_URL) ? process.env.FRONTEND_URL : [process.env.FRONTEND_URL])
  : ["http://localhost:3000", "http://localhost:5173"];

const io = new Server(server, {
  cors: {
    origin: frontendOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSocket(io);

app.use(helmet());

app.use(cors({
  origin: frontendOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));

app.use(apiLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: ENV === "development" ? err.message : undefined
  });
});

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
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

export { app, io };