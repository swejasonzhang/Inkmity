import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";

const ENV = process.env.NODE_ENV || "development";
const tryEnv = (p) => {
  if (!p) return false;
  const abs = path.resolve(process.cwd(), p);
  const res = dotenv.config({ path: abs });
  return !res.error;
};
if (
  !tryEnv(`.env.${ENV}`) &&
  !tryEnv(`.env`) &&
  !tryEnv(path.join("..", `.env.${ENV}`)) &&
  !tryEnv(path.join("..", `.env`))
) {
  console.warn(
    `[env] No .env file found (NODE_ENV=${ENV}). Relying on process env.`
  );
}

const REQUIRED = [
  "MONGO_URI",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "APP_URL",
];
const logger = (await import("./utils/logger.js")).default;

for (const k of REQUIRED) {
  if (!process.env[k]) {
    logger.error(`Missing required env var: ${k}`);
    process.exit(1);
  }
}

const { default: express } = await import("express");
const { default: cors } = await import("cors");
const { default: http } = await import("http");
const { Server } = await import("socket.io");
const { default: helmet } = await import("helmet");
const { connectDB, checkDBHealth } = await import("./config/db.js");
const { initSocket } = await import("./services/socketService.js");
const { requestIdMiddleware } = await import("./middleware/requestId.js");
const { apiLimiter, authLimiter } = await import("./middleware/rateLimiter.js");
const { errorHandler } = await import("./middleware/errorHandler.js");
const { requestTimeout } = await import("./middleware/timeout.js");
const { default: userRoutes } = await import("./routes/users.js");
const { default: reviewRoutes } = await import("./routes/reviews.js");
const { default: dashboardRoutes } = await import("./routes/dashboard.js");
const { default: messageRoutes } = await import("./routes/messages.js");
const { default: availabilityRoutes } = await import(
  "./routes/availability.js"
);
const { default: bookingRoutes } = await import("./routes/bookings.js");
const { default: authRoutes } = await import("./routes/auth.js");
const { default: artistPolicyRoutes } = await import(
  "./routes/artistPolicy.js"
);
const { default: billingRoutes } = await import("./routes/billing.js");
const { default: imagesRoutes } = await import("./routes/images.js");
const { requireAuth } = await import("./middleware/auth.js");
const { stripeWebhook } = await import("./controllers/billingController.js");

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const PORT = Number(process.env.PORT || 5005);
const allowed = new Set([
  FRONTEND_ORIGIN.replace(/\/+$/, ""),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowed.has(origin.replace(/\/+$/, ""))) return cb(null, true);
      return cb(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(requestIdMiddleware);

app.use(requestTimeout(30000));

app.use("/api/", apiLimiter);

app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", async (_req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    const health = {
      ok: dbHealth.healthy,
      env: ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      database: dbHealth,
    };

    const statusCode = health.ok ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      ok: false,
      env: ENV,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/artist-policy", artistPolicyRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/images", imagesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

app.use(errorHandler);

const io = new Server(server, {
  cors: { origin: [...allowed], methods: ["GET", "POST"], credentials: true },
  path: process.env.SOCKET_PATH || "/socket.io",
});
initSocket(io);

(async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, { env: ENV, port: PORT });
    });
  } catch (e) {
    logger.error("Failed to start server", { error: e.message, stack: e.stack });
    process.exit(1);
  }
})();

const shutdown = (sig) => async () => {
  try {
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  } catch {
    process.exit(1);
  }
};
process.on("SIGINT", shutdown("SIGINT"));
process.on("SIGTERM", shutdown("SIGTERM"));
