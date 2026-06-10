import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  fetchDocument,
  getSignatureStatus,
  signDocument,
  listMySignatures,
} from "../controllers/documentController.js";

const router = Router();

router.get("/mine", requireAuth(), listMySignatures);
router.get("/:docType", fetchDocument);
router.get("/:docType/status", requireAuth(), getSignatureStatus);
router.post("/:docType/sign", requireAuth(), signDocument);

export default router;
