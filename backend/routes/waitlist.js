import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { join, leave, mine, forArtist } from "../controllers/waitlistController.js";

const router = Router();

router.post("/", requireAuth(), join);
router.get("/mine", requireAuth(), mine);
router.get("/artist", requireAuth(), forArtist);
router.delete("/:id", requireAuth(), leave);

export default router;
