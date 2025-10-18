import { Router } from "express";
import {
  checkoutPlatformFee,
  checkoutDeposit,
  refundBilling,
  createPortalSession,
  scheduleCancel,
} from "../controllers/billingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/checkout", requireAuth(), checkoutPlatformFee);
router.post("/deposit", requireAuth(), checkoutDeposit);
router.post("/refund", requireAuth(), refundBilling);
router.post("/portal", requireAuth(), createPortalSession);
router.post("/schedule-cancel", requireAuth(), scheduleCancel);

export default router;