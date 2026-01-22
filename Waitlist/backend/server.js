import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import waitlistRoutes from "./routes/waitlist.js";
import {
  apiLimiter,
  postLimiter,
  securityHeaders,
  validateRequestSize,
  ipFilter,
} from "./middleware/security.js";
import { sanitizeInput } from "./middleware/validation.js";

const app = express();

const allowlist = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://inkmity.com",
  "https://www.inkmity.com",
]);
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(",").forEach((o) =>
    allowlist.add(o.trim())
  );
}

app.set("trust proxy", 1);

app.use(ipFilter);
app.use(securityHeaders);
app.use(validateRequestSize);
app.use(sanitizeInput);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.postmarkapp.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
  })
);

app.use(
  cors({
    origin(origin, cb) {
      if (
        !origin ||
        allowlist.has(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin)
      )
        return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    maxAge: 86400,
    credentials: false,
  })
);

app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});

app.use("/api", apiLimiter);
app.use("/api/waitlist", postLimiter);

app.use(express.json({ limit: "256kb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));

app.use("/api/waitlist", waitlistRoutes);
app.get("/healthz", (req, res) => res.status(200).json({ ok: true }));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", {
    message: err?.message,
    stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.clientIP || req.ip,
  });

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500
      ? "Server error, please try again later"
      : err.message || "An error occurred";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
});

const PORT = process.env.PORT || 8080;
const URI = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.set("strictQuery", true);
mongoose
  .connect(URI, { dbName: process.env.MONGODB_DB || undefined })
  .then(() => app.listen(PORT, () => console.log(`API on :${PORT}`)))
  .catch((err) => {
    console.error("Mongo connect error:", err?.message || err);
    process.exit(1);
  });