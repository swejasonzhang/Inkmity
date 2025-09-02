import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendMessage, getMessages } from "../controllers/messageController.js";

const router = express.Router();

router.post("/", requireAuth(), sendMessage);
router.get("/", requireAuth(), getMessages);

export default router;