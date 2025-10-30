import { Router } from "express";
import {
  getAvailability,
  upsertAvailability,
  getSlotsForDate,
} from "../controllers/availabilityController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:artistId", getAvailability);
router.get("/:artistId/slots", getSlotsForDate);
router.put("/:artistId", requireAuth(), upsertAvailability);

export default router;