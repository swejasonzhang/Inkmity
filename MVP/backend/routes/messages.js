import express from "express";
import {
  getAllMessagesForUser,
  createMessage,
} from "../controllers/messageController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.get("/user/:userId", requireAuth(), getAllMessagesForUser);
router.post("/", requireAuth(), createMessage);
export default router;
