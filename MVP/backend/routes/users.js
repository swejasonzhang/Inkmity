import express from "express";
import {
  getArtists,
  getArtistById,
  syncUser,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", getArtists);
router.get("/:id", getArtistById);
router.post("/sync", syncUser);

export default router;