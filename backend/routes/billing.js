import { Router } from "express";
import {
  checkoutPlatformFee,
  checkoutDeposit,
  createDepositPaymentIntent,
  createCardSetupIntent,
  createBankSetupIntent,
  createClientSetupIntent,
  listClientPaymentMethods,
  deleteClientPaymentMethod,
  createFinalPaymentIntent,
  createTipCheckout,
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
router.post("/bank-setup-intent", requireAuth(), createBankSetupIntent);
router.post("/client/setup-intent", requireAuth(), createClientSetupIntent);
router.get("/client/payment-methods", requireAuth(), listClientPaymentMethods);
router.post("/client/payment-methods/delete", requireAuth(), deleteClientPaymentMethod);
router.post("/final-payment/intent", requireAuth(), createFinalPaymentIntent);
router.post("/tip", requireAuth(), createTipCheckout);
router.post("/refund", requireAuth(), refundBilling);
router.post("/portal", requireAuth(), createPortalSession);
router.post("/schedule-cancel", requireAuth(), scheduleCancel);
router.post("/breakdown", requireAuth(), getPaymentBreakdown);
export default router;