import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getMe,
  syncUser,
  getAvatarSignature,
  updateMyAvatar,
  deleteMyAvatar,
  getReferenceSignature,
  saveMyReferences,
  getArtists,
  getArtistById,
} from "../controllers/userController.js";

const router = Router();

router.get("/me", requireAuth(), getMe);
router.post("/sync", requireAuth(), syncUser);

router.get("/avatar/signature", requireAuth(), getAvatarSignature);
router.put("/me/avatar", requireAuth(), updateMyAvatar);
router.delete("/me/avatar", requireAuth(), deleteMyAvatar);

router.get("/references/signature", requireAuth(), getReferenceSignature);
router.put("/me/references", requireAuth(), saveMyReferences);

router.get("/artists", getArtists);
router.get("/artists/:id", getArtistById);

export default router;