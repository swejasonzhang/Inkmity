import { Router } from "express";
import { getBookingsForDay, createBooking } from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", getBookingsForDay);

router.post("/", requireAuth(), createBooking);

export default router;