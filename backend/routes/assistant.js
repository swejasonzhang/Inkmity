import { Router } from "express";
import { chatAssistant } from "../controllers/assistantController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/chat", requireAuth(), chatAssistant);

export default router;
