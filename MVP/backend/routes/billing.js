import { Router } from "express";
import {
  createCheckoutSession,
  refundBilling,
  createPortalSession,
  scheduleCancel,
} from "../controllers/billingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/checkout", requireAuth(), createCheckoutSession);
router.post("/refund", requireAuth(), refundBilling);
router.post("/portal", requireAuth(), createPortalSession);
router.post("/schedule-cancel", requireAuth(), scheduleCancel);

export default router;