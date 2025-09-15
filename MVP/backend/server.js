import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socketService.js";

import artistRoutes from "./routes/artists.js";
import reviewRoutes from "./routes/reviews.js";
import dashboardRoutes from "./routes/dashboard.js";
import messageRoutes from "./routes/messages.js";

import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

connectDB();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/artists", artistRoutes);
app.use("/api/reviews", reviewRoutes);

app.use("/api/dashboard", requireAuth(), dashboardRoutes);
app.use("/api/messages", requireAuth(), messageRoutes);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSocket(io);

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));