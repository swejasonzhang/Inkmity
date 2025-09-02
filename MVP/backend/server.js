import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

import dashboardRoutes from "./routes/dashboard.js"; 

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Mount your routes with Clerk auth middleware
app.use("/api/dashboard", ClerkExpressRequireAuth(), dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));