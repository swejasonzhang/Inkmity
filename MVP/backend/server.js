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

import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const PORT = process.env.PORT || 5005;

await connectDB();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);

app.use("/api/dashboard", requireAuth(), dashboardRoutes);
app.use("/api/messages", requireAuth(), messageRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found", path: req.originalUrl }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
initSocket(io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));