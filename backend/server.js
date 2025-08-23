import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import waitlistRoutes from "./routes/waitlistRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();

console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log("GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "Loaded" : "Missing");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/waitlist", waitlistRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5005;
connectDB();
app.listen(PORT, () => console.log(`🚀 Server running on Port ${PORT}`));