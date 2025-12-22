import { Router } from "express";
import {
  getArtistPolicy,
  upsertArtistPolicy,
  getBookingGate,
  enableClientBookings,
} from "../controllers/artistPolicyController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:artistId", getArtistPolicy);
router.put("/:artistId", requireAuth(), upsertArtistPolicy);
router.get("/:artistId/booking-gate", getBookingGate);
router.post("/enable-client-bookings", requireAuth(), enableClientBookings);

export default router;