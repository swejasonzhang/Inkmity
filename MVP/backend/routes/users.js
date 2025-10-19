import express from "express";
import {
  getMe,
  getAvatarSignature,
  updateMyAvatar,
  deleteMyAvatar,
  getReferenceSignature,
  saveMyReferences,
  getArtists,
  getArtistById,
  syncUser,
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

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