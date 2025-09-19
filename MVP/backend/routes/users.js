import express from "express";
import { getArtists, getArtistById } from "../controllers/userController.js";

const router = express.Router();

router.get("/", getArtists);
router.get("/:id", getArtistById);

export default router;