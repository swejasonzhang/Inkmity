import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";

import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socketService.js";

import artistRoutes from "./routes/artists.js";
import reviewRoutes from "./routes/reviews.js";
import dashboardRoutes from "./routes/dashboard.js";
import messageRoutes from "./routes/messages.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

connectDB();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/artists", artistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/messages", messageRoutes);

initSocket(server);

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
