import express from "express";
import {
  getTotalSignups,
  joinWaitlist,
} from "../controllers/waitlistController.js";
import {
  validateWaitlistSignup,
  handleValidationErrors,
} from "../middleware/validation.js";
import { signupLimiter } from "../middleware/security.js";

const router = express.Router();

router.get("/", getTotalSignups);
router.post(
  "/",
  signupLimiter,
  validateWaitlistSignup,
  handleValidationErrors,
  joinWaitlist
);

export default router;