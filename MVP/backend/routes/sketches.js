import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createSketch,
  listSketches,
  respondToSketch,
} from "../controllers/sketchController.js";

const router = Router();

router.get("/", requireAuth(), listSketches);
router.post("/", requireAuth(), createSketch);
router.post("/:id/respond", requireAuth(), respondToSketch);

export default router;
