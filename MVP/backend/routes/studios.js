import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createStudio,
  getStudio,
  getMyStudios,
  updateStudio,
  listMembers,
  inviteArtist,
  getMyMemberships,
  respondToInvite,
  updateMember,
  removeMember,
  createStudioConnect,
  createStudioAccountLink,
  getStudioConnectStatus,
  setStudioVerification,
} from "../controllers/studioController.js";

const router = Router();

router.post("/", requireAuth(), createStudio);
router.get("/mine", requireAuth(), getMyStudios);

router.get("/memberships/mine", requireAuth(), getMyMemberships);
router.post("/memberships/:membershipId/respond", requireAuth(), respondToInvite);

router.get("/:studioId/members", requireAuth(), listMembers);
router.post("/:studioId/invite", requireAuth(), inviteArtist);
router.patch("/:studioId/members/:artistClerkId", requireAuth(), updateMember);
router.delete("/:studioId/members/:artistClerkId", requireAuth(), removeMember);

router.patch("/:studioId/verification", requireAuth(), setStudioVerification);

router.post("/:studioId/connect/account", requireAuth(), createStudioConnect);
router.post("/:studioId/connect/account-link", requireAuth(), createStudioAccountLink);
router.get("/:studioId/connect/status", requireAuth(), getStudioConnectStatus);

router.get("/:studioId", getStudio);
router.patch("/:studioId", requireAuth(), updateStudio);

export default router;
