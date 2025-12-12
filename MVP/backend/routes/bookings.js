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
  createConsultation,
  createTattooSession,
  rescheduleAppointment,
  markNoShow,
  submitIntakeForm,
  getIntakeForm,
  getAppointmentDetails,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", getBookingsForDay);
router.get("/client", requireAuth(), getClientBookings);
router.get("/artist", requireAuth(), getArtistBookings);
router.get("/:id", getBooking);
router.get("/:id/details", requireAuth(), getAppointmentDetails);
router.post("/", requireAuth(), createBooking);
router.post("/consultation", requireAuth(), createConsultation);
router.post("/session", requireAuth(), createTattooSession);
router.post("/:id/cancel", requireAuth(), cancelBooking);
router.post("/:id/complete", requireAuth(), completeBooking);
router.post("/:id/reschedule", requireAuth(), rescheduleAppointment);
router.post("/:id/no-show", requireAuth(), markNoShow);
router.post("/:id/verify/start", requireAuth(), startVerification);
router.post("/:id/verify", requireAuth(), verifyBookingCode);
router.post("/:bookingId/intake", requireAuth(), submitIntakeForm);
router.get("/:bookingId/intake", requireAuth(), getIntakeForm);
export default router;