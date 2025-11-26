import { Router } from "express";
import {
  getBookingsForDay,
  createBooking,
  getBooking,
  cancelBooking,
  completeBooking,
  startVerification,
  verifyBookingCode,
  getBookingsForArtist,
  getBookingsForClient,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", getBookingsForDay);
router.get("/artist", requireAuth(), getBookingsForArtist);
router.get("/client", requireAuth(), getBookingsForClient);
router.get("/:id", getBooking);
router.post("/", requireAuth(), createBooking);
router.post("/:id/cancel", requireAuth(), cancelBooking);
router.post("/:id/complete", requireAuth(), completeBooking);
router.post("/:id/verify/start", requireAuth(), startVerification);
router.post("/:id/verify", requireAuth(), verifyBookingCode);
export default router;