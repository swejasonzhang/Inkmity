import { Router } from "express";
import {
  checkoutPlatformFee,
  checkoutDeposit,
  refundBilling,
  createPortalSession,
  scheduleCancel,
  stripeWebhook,
} from "../controllers/billingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.post("/checkout", requireAuth(), checkoutPlatformFee);
router.post("/deposit", requireAuth(), checkoutDeposit);
router.post("/refund", requireAuth(), refundBilling);
router.post("/portal", requireAuth(), createPortalSession);
router.post("/schedule-cancel", requireAuth(), scheduleCancel);
export default router;

export function mountStripeWebhook(app) {
  app.post(
    "/api/billing/webhook",
    (req, _res, next) => {
      let data = Buffer.alloc(0);
      req.on("data", (chunk) => (data = Buffer.concat([data, chunk])));
      req.on("end", () => {
        req.rawBody = data;
        next();
      });
    },
    stripeWebhook
  );
}
