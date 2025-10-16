import { Router } from "express";
import { checkEmail } from "../controllers/authController.js";

const router = Router();

router.get("/check-email", checkEmail);

export default router;