import express from "express";
import {
  getAllMessagesForUser,
  createMessage,
  deleteConversationForUser,
  createMessageRequest,
  listIncomingRequests,
  acceptMessageRequest,
  declineMessageRequest,
  getGateStatus,
} from "../controllers/messageController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/user/:userId", requireAuth(), getAllMessagesForUser);
router.post("/", requireAuth(), createMessage);
router.delete("/conversations", requireAuth(), deleteConversationForUser);
router.get("/gate/:artistId", requireAuth(), getGateStatus);
router.post("/request", requireAuth(), createMessageRequest);
router.get("/requests", requireAuth(), listIncomingRequests);
router.post("/requests/:id/accept", requireAuth(), acceptMessageRequest);
router.post("/requests/:id/decline", requireAuth(), declineMessageRequest);

export default router;