import { Router } from "express";
import {
  getBookingsForDay,
  createBooking,
  getBooking,
  cancelBooking,
  completeBooking,
  startVerification,
  verifyBookingCode,
  getClientBookings,
  getArtistBookings,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", getBookingsForDay);
router.get("/client", requireAuth(), getClientBookings);
router.get("/artist", requireAuth(), getArtistBookings);
router.get("/:id", getBooking);
router.post("/", requireAuth(), createBooking);
router.post("/:id/cancel", requireAuth(), cancelBooking);
router.post("/:id/complete", requireAuth(), completeBooking);
router.post("/:id/verify/start", requireAuth(), startVerification);
router.post("/:id/verify", requireAuth(), verifyBookingCode);
export default router;