import { Router } from "express";
import {
  signUpload,
  saveImages,
  listImages,
  deleteImage,
} from "../controllers/imageController.js";

const router = Router();

router.get("/sign", signUpload);
router.post("/sign", signUpload);
router.post("/images/save", saveImages);
router.get("/images", listImages);
router.delete("/images/:id", deleteImage);

export default router;
export { router };