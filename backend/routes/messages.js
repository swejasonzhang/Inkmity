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
  getUnreadState,
  getNotifications,
  markConversationRead,
} from "../controllers/messageController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/user/:userId", requireAuth(), getAllMessagesForUser);
router.get("/unread", requireAuth(), getUnreadState);
router.get("/notifications", requireAuth(), getNotifications);
router.post("/read", requireAuth(), markConversationRead);

router.post("/", requireAuth(), createMessage);
router.delete("/conversations", requireAuth(), deleteConversationForUser);

router.get("/gate/:artistId", requireAuth(), getGateStatus);

router.post("/request", requireAuth(), createMessageRequest);
router.get("/requests", requireAuth(), listIncomingRequests);
router.post("/requests/:id/accept", requireAuth(), acceptMessageRequest);
router.post("/requests/:id/decline", requireAuth(), declineMessageRequest);

export default router;