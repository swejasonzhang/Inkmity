import { Router } from "express";
import {
  getArtistPolicy,
  upsertArtistPolicy,
} from "../controllers/artistPolicyController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:artistId", getArtistPolicy);
router.put("/:artistId", requireAuth(), upsertArtistPolicy);

export default router;