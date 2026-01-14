import { userRepository } from "../repositories/index.js";
import { ensureUniqueHandle, isValidHandle } from "../lib/handle.js";
import mongoose from "mongoose";

const SAFE_ROLES = new Set(["client", "artist"]);

const cleanBio = (s) =>
  typeof s === "string"
    ? s.trim().replace(/\s+/g, " ").slice(0, 600)
    : undefined;

const stripToHandleBase = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "");

const withAt = (s = "") => (s.startsWith("@") ? s : `@${s}`);

export const userService = {
  async getByClerkId(clerkId) {
    return await userRepository.findByClerkId(clerkId);
  },

  async getById(id) {
    return await userRepository.findById(id);
  },

  async syncUser(clerkId, userData) {
    const { email, role: rawRole, handle, username: bodyUsername, profile = {}, bio: bodyBio } = userData;

    if (!clerkId || !email || !rawRole) {
      throw new Error("clerkId, email, role are required");
    }

    const role = SAFE_ROLES.has(rawRole) ? rawRole : "client";
    const existing = await userRepository.findByClerkId(clerkId, false);

    const finalUsername = String(bodyUsername || "").trim() || existing?.username || "user";

    let targetHandle = existing?.handle;
    if (!targetHandle) {
      const baseForHandle =
        stripToHandleBase(handle) ||
        stripToHandleBase(finalUsername) ||
        stripToHandleBase(email.split("@")[0] || "user");

      const ensuredBase = await ensureUniqueHandle(
        mongoose.connection.db,
        baseForHandle
      );
      targetHandle = withAt(ensuredBase);
    }

    const bio = cleanBio(bodyBio ?? profile.bio) || "";
    const normalizedStyles = Array.isArray(profile.styles)
      ? profile.styles
      : typeof profile.style === "string" && profile.style.trim()
      ? [profile.style.trim()]
      : [];

    const styles = normalizedStyles
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    const visible = userData.visible !== undefined
      ? Boolean(userData.visible)
      : (existing?.visible !== undefined ? existing.visible : true);

    const visibility = userData.visibility && ["online", "away", "invisible"].includes(userData.visibility)
      ? userData.visibility
      : (existing?.visibility || "online");

    const setDoc = {
      clerkId,
      email,
      username: finalUsername,
      handle: targetHandle,
      role,
      bio,
      visible,
      visibility,
      ...(styles.length ? { styles } : {}),
    };

    if (role === "client") {
      const min = Number(profile.budgetMin ?? 100);
      const max = Number(profile.budgetMax ?? 200);
      const budgetMin = Number.isFinite(min)
        ? Math.max(0, Math.min(5000, min))
        : 100;
      let budgetMax = Number.isFinite(max)
        ? Math.max(0, Math.min(5000, max))
        : 200;
      if (budgetMax <= budgetMin) budgetMax = Math.max(budgetMin + 1, 200);

      const refs = (
        Array.isArray(profile.referenceImages) ? profile.referenceImages : []
      )
        .map((u) => String(u || "").trim())
        .filter(Boolean)
        .slice(0, 3);

      Object.assign(setDoc, {
        budgetMin,
        budgetMax,
        location: profile.location ?? "",
        placement: profile.placement ?? "",
        size: profile.size ?? "",
        ...(refs.length ? { references: refs } : {}),
      });
    } else {
      const years = Number(profile.years ?? profile.yearsExperience ?? 0);
      const baseRate = Number(profile.baseRate ?? 0);
      const bookingPreference = profile.bookingPreference || "open";
      const travelFrequency = profile.travelFrequency || "rare";
      const shop = profile.shop || "";
      const shopAddress = profile.shopAddress || "";
      const shopLat = Number.isFinite(profile.shopLat) ? Number(profile.shopLat) : undefined;
      const shopLng = Number.isFinite(profile.shopLng) ? Number(profile.shopLng) : undefined;
      const coverImage = profile.coverImage || "";
      const portfolio = (
        Array.isArray(profile.portfolioImages) ? profile.portfolioImages : []
      )
        .map((u) => String(u || "").trim())
        .filter(Boolean)
        .slice(0, 3);

      const restrictedPlacements = Array.isArray(profile.restrictedPlacements)
        ? profile.restrictedPlacements
            .map((p) => String(p || "").trim())
            .filter(Boolean)
        : [];

      Object.assign(setDoc, {
        location: profile.location ?? "",
        shop,
        shopAddress,
        ...(shopLat !== undefined ? { shopLat } : {}),
        ...(shopLng !== undefined ? { shopLng } : {}),
        yearsExperience: Number.isFinite(years) ? Math.max(0, years) : 0,
        baseRate: Number.isFinite(baseRate) ? Math.max(0, baseRate) : 0,
        bookingPreference,
        travelFrequency,
        ...(coverImage ? { coverImage } : {}),
        ...(portfolio.length ? { portfolioImages: portfolio } : {}),
        ...(restrictedPlacements.length ? { restrictedPlacements } : {}),
      });
    }

    return await userRepository.upsert(clerkId, setDoc);
  },

  async updateAvatar(clerkId, avatarData) {
    const { url, publicId, alt, width, height } = avatarData;

    if (!url) {
      throw new Error("url_required");
    }

    return await userRepository.updateByClerkId(clerkId, {
      avatar: { url, publicId, alt, width, height },
    });
  },

  async deleteAvatar(clerkId) {
    return await userRepository.updateByClerkId(clerkId, {
      avatar: undefined,
    });
  },

  async updateBio(clerkId, bio) {
    const cleanedBio = cleanBio(bio) || "";
    return await userRepository.updateByClerkId(clerkId, { bio: cleanedBio });
  },

  async updateVisibility(clerkId, visibility) {
    if (!visibility || !["online", "away", "invisible"].includes(visibility)) {
      throw new Error("Invalid visibility status");
    }

    return await userRepository.updateByClerkId(clerkId, { visibility });
  },

  async getArtists(filters = {}) {
    return await userRepository.findArtists({}, filters);
  },

  async getFeaturedArtists(limit = 5) {
    return await userRepository.findFeaturedArtists(limit);
  },

  async checkHandleAvailability(handle) {
    const raw = String(handle || "").trim();
    const base = stripToHandleBase(raw);

    if (!base) {
      throw new Error("handle_required");
    }

    if (!isValidHandle(base)) {
      return { ok: true, available: false, handle: withAt(base) };
    }

    const publicHandle = withAt(base);
    const available = await userRepository.isHandleAvailable(publicHandle);

    return { ok: true, available, handle: publicHandle };
  },
};
