import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

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

import { requireAuth } from "./middleware/auth.js";

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const PORT = Number(process.env.PORT) || 5005;

await connectDB();

const allowed = new Set([
  FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", requireAuth(), dashboardRoutes);
app.use("/api/messages", requireAuth(), messageRoutes);
app.use("/api/artist-policy", artistPolicyRoutes);
app.use("/api/billing", billingRoutes);

app.use((req, res) =>
  res.status(404).json({ error: "Not found", path: req.originalUrl })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

const io = new Server(server, {
  cors: { origin: [...allowed], methods: ["GET", "POST"], credentials: true },
});
initSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});