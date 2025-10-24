import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import waitlistRoutes from "./routes/waitlist.js";

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

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "256kb" }));

app.use("/api/waitlist", waitlistRoutes);
app.get("/healthz", (req, res) => res.status(200).json({ ok: true }));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 8080;
const URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", true);
mongoose
  .connect(URI, { dbName: process.env.MONGODB_DB || undefined })
  .then(() => app.listen(PORT, () => console.log(`API on :${PORT}`)))
  .catch((err) => {
    console.error("Mongo connect error:", err?.message || err);
    process.exit(1);
  });