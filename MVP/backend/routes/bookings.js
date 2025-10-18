import { Router } from "express";
import { getBookingsForDay, createBooking, getBooking, cancelBooking, completeBooking } from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", getBookingsForDay);
router.get("/:id", getBooking);
router.post("/", requireAuth(), createBooking);
router.post("/:id/cancel", requireAuth(), cancelBooking);
router.post("/:id/complete", requireAuth(), completeBooking);

export default router;