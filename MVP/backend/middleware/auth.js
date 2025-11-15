import { requireAuth, getAuth } from "@clerk/express";
import RevokedToken from "../models/RevokedToken.js";
import crypto from "crypto";

function extractTokenFromHeader(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return null;
  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function checkTokenRevocation(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return next();
    }

    const tokenHash = hashToken(token);
    const revoked = await RevokedToken.findOne({ tokenId: tokenHash });
    if (revoked) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    next();
  } catch (error) {
    console.error("[checkTokenRevocation] Error:", error);
    next();
  }
}

export function requireAuthWithRevocation() {
  return [checkTokenRevocation, requireAuth()];
}

export { requireAuth, getAuth };