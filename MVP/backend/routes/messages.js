import express from "express";
import { getMessages, getAllMessagesForUser, sendMessage } from "../controllers/messageController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/:userId/:otherUserId", requireAuth(), getMessages);
router.get("/user/:userId", requireAuth(), getAllMessagesForUser);
router.post("/", requireAuth(), sendMessage);

export default router;