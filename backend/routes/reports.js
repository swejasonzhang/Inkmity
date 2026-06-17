import { Router } from "express";
import { createReport, listReports, updateReportStatus } from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.post("/", requireAuth(), createReport);
router.get("/", requireAuth(), listReports);
router.patch("/:id", requireAuth(), updateReportStatus);
export default router;
