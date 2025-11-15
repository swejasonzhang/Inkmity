import { Router } from "express";
import { checkEmail, revokeToken } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/check-email", checkEmail);
router.post("/revoke-token", requireAuth(), revokeToken);

export default router;