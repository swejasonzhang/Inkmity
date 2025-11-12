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

      const entry = await Waitlist.create({ name: rawName, email });
      const first = rawName.split(" ")[0];

      try {
        const mod = await import("../../config/email.js").catch(() => null);
        if (mod?.sendWelcomeEmail) {
          await mod.sendWelcomeEmail({
            to: email,
            subject: `${first}, welcome to Inkmity`,
            text: `Hi ${first},

You're on the list.

We’re building a reliable, high-quality way to discover artists, keep every message and reference in one place, and book with clarity on price and availability.

We’ll email you when early access opens.

— Inkmity`,
            html: `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>Welcome to Inkmity</title>
  </head>
  <body style="margin:0;padding:0;background:#0b0b0b;color:#e5e5e5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 8px;text-align:center;background:
                radial-gradient(120px 80px at 20% 0%, rgba(255,255,255,0.08), transparent),
                radial-gradient(120px 80px at 80% 100%, rgba(255,255,255,0.06), transparent);">
                <img src="https://inkmity.com/logo.png" alt="Inkmity" width="120" height="36" style="display:inline-block;border:0;outline:none;text-decoration:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.35));" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <h2 style="margin:0 0 6px;font-size:24px;line-height:1.25;color:#fff;">Hi ${first}, you’re in.</h2>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#d4d4d4;">
                  We’re building a reliable, high-quality experience to <strong style="color:#fff;">discover artists</strong>, keep every <strong style="color:#fff;">message and reference</strong> in one place, and <strong style="color:#fff;">book with zero guesswork</strong> on price or availability.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 10px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;">
                  <tr>
                    <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;font-size:13px;color:#e5e5e5;">• Thoughtful discovery for style and budget</td>
                  </tr>
                  <tr>
                    <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;font-size:13px;color:#e5e5e5;">• One thread for messages and references</td>
                  </tr>
                  <tr>
                    <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;font-size:13px;color:#e5e5e5;">• Clear pricing, availability, and booking</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 28px 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#d4d4d4;">
                  We’ll email you when early access opens. No spam.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 28px;border-top:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  © ${new Date().getFullYear()} Inkmity. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
          });
        }
      } catch {}

      const totalSignups = await Waitlist.countDocuments();

      return res.status(201).json({
        message: "Added to waitlist",
        data: { id: entry._id, name: entry.name, email: entry.email },
        meta: { totalSignups },
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