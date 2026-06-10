import { Router } from "express";
import {
  signUpload,
  saveImages,
  listImages,
  deleteImage,
} from "../controllers/imageController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/sign", requireAuth(), signUpload);
router.post("/sign", requireAuth(), signUpload);
router.post("/images/save", requireAuth(), saveImages);
router.get("/images", requireAuth(), listImages);
router.delete("/images/:id", requireAuth(), deleteImage);

export default router;