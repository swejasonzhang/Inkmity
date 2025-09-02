import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getArtists, getArtistById } from "../controllers/artistController.js";

const router = express.Router();

router.get("/", getArtists);
router.get("/:id", getArtistById);

export default router;