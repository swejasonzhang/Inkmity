import mongoose from "mongoose";
import Waitlist from "../../models/Waitlist.js";

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
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({ totalSignups });
    }

    if (req.method === "POST") {
      const body = getBody(req);
      const rawName = String(body.name || "")
        .trim()
        .replace(/\s+/g, " ");
      const email = String(body.email || "")
        .trim()
        .toLowerCase();

      if (!rawName || !email)
        return res.status(400).json({ error: "Name and email are required" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: "Use a valid email" });
      if (rawName.length > 120)
        return res.status(400).json({ error: "Name is too long" });

      const existing = await Waitlist.findOne({ email });
      if (existing) {
        const totalSignups = await Waitlist.countDocuments();
        return res.status(200).json({
          message: "Already on waitlist",
          data: {
            id: existing._id,
            name: existing.name,
            email: existing.email,
          },
          meta: { totalSignups },
        });
      }

      const preCount = await Waitlist.countDocuments();
      const entry = await Waitlist.create({ name: rawName, email });
      const position = preCount + 1;
      const first = rawName.split(" ")[0];
      const refCode = entry._id.toString().slice(-8);
      const shareUrl = `https://inkmity.com/?r=${refCode}`;

      try {
        const mod = await import("../../config/email.js").catch(() => null);
        if (mod?.sendWelcomeEmail) {
          await mod.sendWelcomeEmail({
            to: email,
            subject: `${first}, you’re on the Inkmity waitlist`,
            text: `Hi ${first},

Welcome to Inkmity — you’re #${position} in line.

We’ll email you at launch. Share your link:
${shareUrl}

With inked love,
Inkmity`,
            html: `<h2>Hi ${first},</h2>
<p>Welcome to <strong>Inkmity</strong> — you’re <strong>#${position}</strong> in line.</p>
<p>We’ll email you at launch. Share your link:</p>
<p><a href="${shareUrl}" target="_blank" rel="noopener noreferrer">${shareUrl}</a></p>
<p style="margin-top:20px;">With inked love,<br><strong>Inkmity</strong></p>`,
          });
        }
      } catch {}

      return res.status(201).json({
        message: "Added to waitlist",
        data: { id: entry._id, name: entry.name, email: entry.email },
        meta: { position, totalSignups: position, refCode, shareUrl },
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    try {
      setCors(req, res);
    } catch {}
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}