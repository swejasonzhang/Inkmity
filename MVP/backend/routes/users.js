import express from "express";
import {
  getArtists,
  getArtistById,
  syncUser,
  getMe,
  updateMyAvatar,
  deleteMyAvatar,
} from "../controllers/userController.js";
import { getAvatarSignature } from "../controllers/uploadController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", requireAuth(), getMe);
router.get("/me/avatar/signature", requireAuth(), getAvatarSignature);
router.put("/me/avatar", requireAuth(), updateMyAvatar);
router.delete("/me/avatar", requireAuth(), deleteMyAvatar);

router.get("/", getArtists);
router.get("/:id", getArtistById);

router.post("/sync", syncUser);

export default router;

// routes/users.js (add new endpoints)
import { getReferenceSignature, saveMyReferences } from "../controllers/userReferencesController.js";

router.get("/me/references/signature", requireAuth(), getReferenceSignature);
router.put("/me/references", requireAuth(), saveMyReferences);
