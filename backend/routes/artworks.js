import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { requireAuth } from "../middleware/auth.js";
import { getPopularArtworks, getTrendingIdeas, toggleArtworkLike } from "../controllers/artworkController.js";

const router = express.Router();

router.get("/popular", clerkMiddleware(), getPopularArtworks);
router.get("/trending-ideas", clerkMiddleware(), getTrendingIdeas);
router.post("/like", requireAuth(), toggleArtworkLike);

export default router;
