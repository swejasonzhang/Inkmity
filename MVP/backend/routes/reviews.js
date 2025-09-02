import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { addReview } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", requireAuth(), addReview);

export default router;