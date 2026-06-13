import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { requireAuth } from "../middleware/auth.js";
import { getPopularArtworks, toggleArtworkLike } from "../controllers/artworkController.js";

const router = express.Router();

router.get("/popular", clerkMiddleware(), getPopularArtworks);
router.post("/like", requireAuth(), toggleArtworkLike);

export default router;
