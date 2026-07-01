import { Router } from "express";
import { retentionTick } from "../controllers/retentionController.js";

const router = Router();

// Internal endpoints are not for browser/client use — they're called by trusted
// schedulers (the Render cron job) and guarded by a shared secret in the handler.
router.post("/retention/tick", retentionTick);

export default router;
