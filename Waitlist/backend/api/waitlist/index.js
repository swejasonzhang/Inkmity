import mongoose from "mongoose";
import Waitlist, { ensureIndexes } from "../../models/Waitlist.js";
import { sendWelcomeEmail } from "../../config/email.js";

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
  await ensureIndexes();
  CONN.ready = true;
}

function setCors(req, res) {
  const allowlist = new Set([
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://inkmity.com",
    "https://www.inkmity.com",
  ]);
  
  const origin = req.headers.origin;
  const allowedOrigin =
    origin && (allowlist.has(origin) || /^http:\/\/localhost:\d+$/.test(origin))
      ? origin
      : "https://inkmity.com";
  
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
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

async function handleGet(req, res) {
  try {
    const totalSignups = await Waitlist.countDocuments();
    return res.status(200).json({ totalSignups });
  } catch (err) {
    console.error("getTotalSignups error:", {
      message: err?.message,
      stack: err?.stack,
      raw: err,
    });
    return res
      .status(500)
      .json({ error: "Server error, please try again later" });
  }
}

async function handlePost(req, res) {
  try {
    const rawName = String(req.body?.name ?? "")
      .trim()
      .replace(/\0/g, "")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/\s+/g, " ");
    
    const emailNorm = String(req.body?.email ?? "")
      .trim()
      .toLowerCase()
      .replace(/\0/g, "")
      .replace(/[\x00-\x1F\x7F]/g, "");

    if (!rawName || !emailNorm) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(emailNorm) || emailNorm.length > 254) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    
    if (rawName.length > 120 || rawName.length < 1) {
      return res.status(400).json({ error: "Name must be between 1 and 120 characters" });
    }
    
    if (!/^[a-zA-Z\s'-]+$/.test(rawName)) {
      return res.status(400).json({ error: "Name contains invalid characters" });
    }

    const firstName = rawName.split(" ")[0];
    const first = firstName;

    const preCount = await Waitlist.countDocuments();
    
    try {
      const result = await Waitlist.findOneAndUpdate(
        { email: emailNorm },
        {
          $setOnInsert: { 
            email: emailNorm, 
            name: rawName 
          },
          $set: {
            name: rawName,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      const createdAt = new Date(result.createdAt).getTime();
      const updatedAt = new Date(result.updatedAt).getTime();
      const timeDiff = Math.abs(updatedAt - createdAt);
      
      const isNewEntry = timeDiff < 100;
      
      if (!isNewEntry) {
        const totalSignups = await Waitlist.countDocuments();
        const refCode = result._id.toString().slice(-8);
        const shareUrl = `https://inkmity.com/?r=${refCode}`;
        return res.status(200).json({
          message: "Already on waitlist",
          data: { id: result._id, name: result.name, email: result.email },
          meta: { totalSignups, emailSent: false, refCode, shareUrl },
        });
      }
      
      const position = preCount + 1;
      const totalSignups = position;
      const entry = result;
      const refCode = entry._id.toString().slice(-8);
      const shareUrl = `https://inkmity.com/?r=${refCode}`;

      const emailResult = await sendWelcomeEmail({
      to: emailNorm,
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <meta name="format-detection" content="telephone=no" />
    <title>Welcome to Inkmity</title>
  </head>
  <body style="margin:0;padding:0;background:#0b0b0b;color:#e5e5e5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            align="center"
            style="max-width:560px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;"
          >
            <tr>
              <td
                align="center"
                style="padding:28px 24px 8px;text-align:center;background:
                  radial-gradient(120px 80px at 20% 0%, rgba(255,255,255,0.08), transparent),
                  radial-gradient(120px 80px at 80% 100%, rgba(255,255,255,0.06), transparent);"
              >
                <img
                  src="https://inkmity.com/logo.png"
                  alt="Inkmity Logo"
                  width="200"
                  height="200"
                  style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.35));max-width:200px;height:auto;"
                  title="Inkmity"
                />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 28px 0;text-align:center;">
                <h2
                  style="margin:0 0 6px;font-size:24px;line-height:1.25;color:#fff;text-align:center;"
                >
                  Hi ${first}, you’re in.
                </h2>
                <p
                  style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#d4d4d4;text-align:center;"
                >
                  We’re building a reliable, high-quality experience to
                  <strong style="color:#fff;">discover artists</strong>, keep every
                  <strong style="color:#fff;">message and reference</strong> in one place,
                  and <strong style="color:#fff;">book with zero guesswork</strong> on price or availability.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 10px;text-align:center;">
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="border-collapse:separate;border-spacing:0_12px;"
                >
                  <tr>
                    <td
                      style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;font-size:13px;color:#e5e5e5;text-align:center;"
                    >
                      • Thoughtful discovery for style and budget
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;font-size:13px;color:#e5e5e5;text-align:center;"
                    >
                      • One thread for messages and references
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;font-size:13px;color:#e5e5e5;text-align:center;"
                    >
                      • Clear pricing, availability, and booking
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 28px 24px;text-align:center;">
                <p
                  style="margin:0;font-size:14px;line-height:1.6;color:#d4d4d4;text-align:center;"
                >
                  We’ll email you when early access opens. No spam.
                </p>
              </td>
            </tr>
            <tr>
              <td
                align="center"
                style="padding:14px 28px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"
              >
                <p
                  style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;"
                >
                  © 2025 Inkmity. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
        name: rawName,
      });

      if (!emailResult.ok) {
        console.error("❌ joinWaitlist: welcome email failed", {
          email: emailNorm,
          name: rawName,
          error: emailResult.error,
          details: emailResult.details,
        });
        console.warn("⚠️  User signup succeeded but welcome email could not be sent");
      } else {
        console.log("✓ New waitlist signup with email sent:", {
          email: emailNorm,
          name: rawName,
          position,
          messageId: emailResult.messageId,
        });
      }

      return res.status(201).json({
        message: "Added to waitlist",
        data: { id: entry._id, name: entry.name, email: entry.email },
        meta: {
          position,
          totalSignups,
          refCode,
          shareUrl,
          emailSent: !!emailResult.ok,
        },
      });
    } catch (createErr) {
      if (createErr?.code === 11000 || createErr?.message?.includes("duplicate key")) {
        const duplicateEntry = await Waitlist.findOne({ email: emailNorm });
        if (duplicateEntry) {
          const totalSignups = await Waitlist.countDocuments();
          const refCode = duplicateEntry._id.toString().slice(-8);
          const shareUrl = `https://inkmity.com/?r=${refCode}`;
          return res.status(200).json({
            message: "Already on waitlist",
            data: { id: duplicateEntry._id, name: duplicateEntry.name, email: duplicateEntry.email },
            meta: { totalSignups, emailSent: false, refCode, shareUrl },
          });
        }
      }
      throw createErr;
    }
  } catch (err) {
    console.error("joinWaitlist error:", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      raw: err,
    });
    
    if (err?.code === 11000 || err?.message?.includes("duplicate key")) {
      try {
        const emailNorm = String(req.body?.email ?? "").trim().toLowerCase();
        const duplicateEntry = await Waitlist.findOne({ email: emailNorm });
        if (duplicateEntry) {
          const totalSignups = await Waitlist.countDocuments();
          const refCode = duplicateEntry._id.toString().slice(-8);
          const shareUrl = `https://inkmity.com/?r=${refCode}`;
          return res.status(200).json({
            message: "Already on waitlist",
            data: { id: duplicateEntry._id, name: duplicateEntry.name, email: duplicateEntry.email },
            meta: { totalSignups, emailSent: false, refCode, shareUrl },
          });
        }
      } catch (lookupErr) {
        console.error("Error looking up duplicate entry:", lookupErr);
      }
      return res.status(200).json({ message: "Already on waitlist" });
    }
    
    return res
      .status(500)
      .json({ error: "Server error, please try again later" });
  }
}

export default async function handler(req, res) {
  try {
    setCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).end();

    if (req.method === "POST") {
      const clientIP = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
      const rateLimitKey = `waitlist_${clientIP}`;
      const now = Date.now();
      const windowMs = 60 * 60 * 1000;
      const maxRequests = 5;
      
      if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
      }
      
      const record = global.rateLimitStore.get(rateLimitKey);
      if (record && now < record.resetTime && record.count >= maxRequests) {
        return res.status(429).json({
          error: "Too many signup attempts, please try again in an hour",
        });
      }
      
      if (!record || now >= record.resetTime) {
        global.rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + windowMs });
      } else {
        record.count++;
      }

      const contentLength = req.headers["content-length"];
      if (contentLength && parseInt(contentLength) > 256 * 1024) {
        return res.status(413).json({ error: "Request payload too large" });
      }
    }

    await connectDB();

    if (req.method === "GET") {
      return handleGet(req, res);
    }

    if (req.method === "POST") {
      req.body = getBody(req);
      return handlePost(req, res);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    try {
      setCors(req, res);
    } catch {}
    console.error("waitlist handler error:", {
      message: err?.message,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
    return res.status(500).json({ error: "Server error, please try again later" });
  }
}