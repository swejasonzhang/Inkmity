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
  createMultiSession,
  rescheduleAppointment,
  markNoShow,
  reportArtistNoShow,
  respondArtistNoShow,
  resolveArtistNoShow,
  listArtistNoShowDisputes,
  checkInBooking,
  submitIntakeForm,
  getIntakeForm,
  deleteIntakeForm,
  getAppointmentDetails,
  acceptAppointment,
  denyAppointment,
  getAppointments,
  checkConsultationStatus,
  setFinalPrice,
  approveFinalPrice,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", requireAuth(), getBookingsForDay);
router.get("/appointments", requireAuth(), getAppointments);
router.get("/client", requireAuth(), getClientBookings);
router.get("/artist", requireAuth(), getArtistBookings);
router.get("/consultation-status", requireAuth(), checkConsultationStatus);
router.get("/no-show-disputes", requireAuth(), listArtistNoShowDisputes);
router.get("/:id", requireAuth(), getBooking);
router.get("/:id/details", requireAuth(), getAppointmentDetails);
router.post("/", requireAuth(), createBooking);
router.post("/consultation", requireAuth(), createConsultation);
router.post("/session", requireAuth(), createTattooSession);
router.post("/multi-session", requireAuth(), createMultiSession);
router.post("/:id/accept", requireAuth(), acceptAppointment);
router.post("/:id/deny", requireAuth(), denyAppointment);
router.post("/:id/cancel", requireAuth(), cancelBooking);
router.get("/:id/cancel-link", cancelBookingViaLink);
router.post("/:id/complete", requireAuth(), completeBooking);
router.patch("/:id/final-price", requireAuth(), setFinalPrice);
router.post("/:id/approve-final-price", requireAuth(), approveFinalPrice);
router.post("/:id/reschedule", requireAuth(), rescheduleAppointment);
router.post("/:id/no-show", requireAuth(), markNoShow);
router.post("/:id/check-in", requireAuth(), checkInBooking);
router.post("/:id/artist-no-show", requireAuth(), reportArtistNoShow);
router.post("/:id/artist-no-show/respond", requireAuth(), respondArtistNoShow);
router.post("/:id/artist-no-show/resolve", requireAuth(), resolveArtistNoShow);
router.post("/:id/verify/start", requireAuth(), startVerification);
router.post("/:id/verify", requireAuth(), verifyBookingCode);
router.post("/:bookingId/intake", requireAuth(), submitIntakeForm);
router.get("/:bookingId/intake", requireAuth(), getIntakeForm);
router.delete("/:bookingId/intake", requireAuth(), deleteIntakeForm);
export default router;