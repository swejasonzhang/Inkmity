import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import waitlistRoutes from "./routes/waitlistRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/waitlist", waitlistRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB();
app.listen(PORT, () => console.log(`🚀 Server running on Port ${PORT}`));