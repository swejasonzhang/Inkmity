import express from "express";
import {
  // account/me
  getMe,
  updateMyAvatar,
  deleteMyAvatar,
  getAvatarSignature,

  // references
  getReferenceSignature,
  saveMyReferences,

  // artists
  getArtists,
  getArtistById,

  // sync
  syncUser,
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Me / profile
router.get("/me", requireAuth(), getMe);
router.get("/me/avatar/signature", requireAuth(), getAvatarSignature);
router.put("/me/avatar", requireAuth(), updateMyAvatar);
router.delete("/me/avatar", requireAuth(), deleteMyAvatar);

// References
router.get("/me/references/signature", requireAuth(), getReferenceSignature);
router.put("/me/references", requireAuth(), saveMyReferences);

// Sync
router.post("/sync", requireAuth(), syncUser);

// Artists
router.get("/", getArtists);
router.get("/:id", getArtistById);

export default router;
