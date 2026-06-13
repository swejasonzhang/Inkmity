import { Router } from "express";
import {
  checkoutPlatformFee,
  checkoutDeposit,
  createDepositPaymentIntent,
  createCardSetupIntent,
  createFinalPaymentIntent,
  refundBilling,
  createPortalSession,
  scheduleCancel,
  getPaymentBreakdown,
} from "../controllers/billingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.post("/checkout", requireAuth(), checkoutPlatformFee);
router.post("/deposit", requireAuth(), checkoutDeposit);
router.post("/deposit/intent", requireAuth(), createDepositPaymentIntent);
router.post("/setup-intent", requireAuth(), createCardSetupIntent);
router.post("/final-payment/intent", requireAuth(), createFinalPaymentIntent);
router.post("/refund", requireAuth(), refundBilling);
router.post("/portal", requireAuth(), createPortalSession);
router.post("/schedule-cancel", requireAuth(), scheduleCancel);
router.post("/breakdown", requireAuth(), getPaymentBreakdown);
export default router;