import { Router } from "express";
import { createReport, listReports } from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.post("/", requireAuth(), createReport);
router.get("/", requireAuth(), listReports);
export default router;
