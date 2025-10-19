import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getMe,
  getAvatarSignature,
  updateMyAvatar,
  deleteMyAvatar,
  getReferenceSignature,
  saveMyReferences,
  syncUser,
  getArtists,
  getArtistById,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", requireAuth(), getMe);
router.get("/me/avatar/signature", requireAuth(), getAvatarSignature);
router.put("/me/avatar", requireAuth(), updateMyAvatar);
router.delete("/me/avatar", requireAuth(), deleteMyAvatar);
router.get("/me/references/signature", requireAuth(), getReferenceSignature);
router.put("/me/references", requireAuth(), saveMyReferences);
router.post("/sync", requireAuth(), syncUser);
router.get("/", getArtists);
router.get("/:id", getArtistById);

export default router;