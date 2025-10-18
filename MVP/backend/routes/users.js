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

router.post("/sync", requireAuth(), syncUser);

export default router;
