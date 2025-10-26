import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";
import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socketService.js";
import userRoutes from "./routes/users.js";
import reviewRoutes from "./routes/reviews.js";
import dashboardRoutes from "./routes/dashboard.js";
import messageRoutes from "./routes/messages.js";
import availabilityRoutes from "./routes/availability.js";
import bookingRoutes from "./routes/bookings.js";
import authRoutes from "./routes/auth.js";
import artistPolicyRoutes from "./routes/artistPolicy.js";
import billingRoutes from "./routes/billing.js";
import uploadRoutes from "./routes/uploads.js";
import { requireAuth } from "./middleware/auth.js";

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
];
for (const k of REQUIRED) {
  if (!process.env[k]) {
    console.error(`Missing required env var: ${k}`);
    process.exit(1);
  }
}

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    env: ENV,
    mongo: Boolean(process.env.MONGO_URI),
    time: new Date().toISOString(),
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", requireAuth(), dashboardRoutes);
app.use("/api/messages", requireAuth(), messageRoutes);
app.use("/api/artist-policy", artistPolicyRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/uploads", uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err?.stack || err);
  const status = Number(err?.status || 500);
  res.status(status).json({ error: err?.message || "Internal Server Error" });
});

const io = new Server(server, {
  cors: { origin: [...allowed], methods: ["GET", "POST"], credentials: true },
  path: process.env.SOCKET_PATH || "/socket.io",
});
initSocket(io);

(async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`✅ Server ready on :${PORT} (NODE_ENV=${ENV})`);
      console.log(`✅ CORS allowed origins: ${[...allowed].join(", ")}`);
    });
  } catch (e) {
    console.error("Failed to start server:", e);
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
