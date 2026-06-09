import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDashboardData, getArtistAnalytics } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", requireAuth(), getDashboardData);
router.get("/artist-analytics", requireAuth(), getArtistAnalytics);

export default router;