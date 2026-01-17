import { Router } from "express";
import {
  getBookingsForDay,
  createBooking,
  getBooking,
  cancelBooking,
  cancelBookingViaLink,
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
  acceptAppointment,
  denyAppointment,
  getAppointments,
  checkConsultationStatus,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", getBookingsForDay);
router.get("/appointments", requireAuth(), getAppointments);
router.get("/client", requireAuth(), getClientBookings);
router.get("/artist", requireAuth(), getArtistBookings);
router.get("/consultation-status", requireAuth(), checkConsultationStatus);
router.get("/:id", getBooking);
router.get("/:id/details", requireAuth(), getAppointmentDetails);
router.post("/", requireAuth(), createBooking);
router.post("/consultation", requireAuth(), createConsultation);
router.post("/session", requireAuth(), createTattooSession);
router.post("/:id/accept", requireAuth(), acceptAppointment);
router.post("/:id/deny", requireAuth(), denyAppointment);
router.post("/:id/cancel", requireAuth(), cancelBooking);
router.get("/:id/cancel-link", cancelBookingViaLink);
router.post("/:id/complete", requireAuth(), completeBooking);
router.post("/:id/reschedule", requireAuth(), rescheduleAppointment);
router.post("/:id/no-show", requireAuth(), markNoShow);
router.post("/:id/verify/start", requireAuth(), startVerification);
router.post("/:id/verify", requireAuth(), verifyBookingCode);
router.post("/:bookingId/intake", requireAuth(), submitIntakeForm);
router.get("/:bookingId/intake", requireAuth(), getIntakeForm);
export default router;