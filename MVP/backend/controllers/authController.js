import { clerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/express";
import RevokedToken from "../models/RevokedToken.js";
import crypto from "crypto";

export const checkEmail = async (req, res) => {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ error: "Missing email" });
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    return res.json({ exists: (users?.length ?? 0) > 0 });
  } catch {
    return res.status(500).json({ error: "Internal error" });
  }
};

function extractTokenFromHeader(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return null;
  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const revokeToken = async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    const tokenHash = hashToken(token);
    const existing = await RevokedToken.findOne({ tokenId: tokenHash });
    if (existing) {
      return res.json({ success: true, message: "Token already revoked" });
    }

    await RevokedToken.create({
      tokenId: tokenHash,
      userId,
      revokedAt: new Date(),
    });

    res.json({ success: true, message: "Token revoked successfully" });
  } catch (error) {
    console.error("[revokeToken] Error:", error);
    res.status(500).json({ error: "Failed to revoke token" });
  }
};