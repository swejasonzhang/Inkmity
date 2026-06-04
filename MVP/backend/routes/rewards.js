import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getMyRewards } from "../controllers/rewardsController.js";

const router = Router();

router.get("/me", requireAuth(), getMyRewards);

export default router;
