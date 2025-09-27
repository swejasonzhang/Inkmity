import { Router } from "express";
import { getAvailability, upsertAvailability } from "../controllers/availabilityController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:artistId", getAvailability);
router.put("/:artistId", requireAuth(), upsertAvailability);

export default router;