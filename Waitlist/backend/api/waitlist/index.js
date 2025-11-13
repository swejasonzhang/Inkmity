import mongoose from "mongoose";
import { getTotalSignups, joinWaitlist } from "../../waitlistController.js";

const CONN = { ready: false };

mongoose.set("strictQuery", true);

async function connectDB() {
  if (CONN.ready) return;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 5,
  });
  CONN.ready = true;
}

const allowlist = new Set([
  "https://inkmity.com",
  "https://www.inkmity.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const allow =
    /^http:\/\/localhost:\d+$/.test(origin) || allowlist.has(origin);
  if (allow) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

function getBody(req) {
  let b = req.body;
  if (!b && req.rawBody) b = req.rawBody;
  if (typeof b === "string") {
    try {
      b = JSON.parse(b);
    } catch {}
  }
  return b || {};
}

export default async function handler(req, res) {
  try {
    setCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).end();

    await connectDB();

    if (req.method === "GET") {
      return getTotalSignups(req, res);
    }

    if (req.method === "POST") {
      req.body = getBody(req);
      return joinWaitlist(req, res);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    try {
      setCors(req, res);
    } catch {}
    console.error("waitlist handler error:", {
      message: err?.message,
      stack: err?.stack,
      raw: err,
    });
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}