import { Router } from "express";
import { checkEmail, devSignInToken } from "../controllers/authController.js";

const router = Router();

router.get("/check-email", checkEmail);
router.post("/dev-sign-in-token", devSignInToken);

export default router;