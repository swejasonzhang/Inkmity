import { Router } from "express";
import { retentionTick } from "../controllers/retentionController.js";

const router = Router();

router.post("/retention/tick", retentionTick);

export default router;
