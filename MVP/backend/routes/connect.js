import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createConnectAccount,
  createAccountLink,
  getConnectStatus,
  createLoginLink,
} from "../controllers/connectController.js";

const router = Router();

router.post("/account", requireAuth(), createConnectAccount);
router.post("/account-link", requireAuth(), createAccountLink);
router.get("/status", requireAuth(), getConnectStatus);
router.post("/login-link", requireAuth(), createLoginLink);

export default router;
