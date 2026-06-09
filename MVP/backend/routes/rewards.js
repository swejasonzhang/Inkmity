import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getMyRewards, getMyCredits, grantCreditToClient } from "../controllers/rewardsController.js";

const router = Router();

router.get("/me", requireAuth(), getMyRewards);
router.get("/credits", requireAuth(), getMyCredits);
router.post("/credits/grant", requireAuth(), grantCreditToClient);

export default router;
