import { Router } from "express";
import {
  getPortfolioUploadSignature,
  createPortfolioItems,
  listArtistPortfolio,
  updatePortfolioItem,
  deletePortfolioItem,
} from "../controllers/portfolioController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me/signature", requireAuth(), getPortfolioUploadSignature);
router.post("/me", requireAuth(), createPortfolioItems);

router.get("/artist/:artistId", listArtistPortfolio);

router.put("/:id", requireAuth(), updatePortfolioItem);
router.delete("/:id", requireAuth(), deletePortfolioItem);

export default router;