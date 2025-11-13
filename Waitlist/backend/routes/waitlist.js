import express from "express";
import {
  getTotalSignups,
  joinWaitlist,
} from "../controllers/waitlistController.js";

const router = express.Router();

router.get("/", getTotalSignups);
router.post("/", joinWaitlist);

export default router;