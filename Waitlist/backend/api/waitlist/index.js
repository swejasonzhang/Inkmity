import mongoose from "mongoose";
import Waitlist from "../../models/Waitlist.js";
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
  CONN.ready = true;
}

function setCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
      .replace(/\s+/g, " ");
    const emailNorm = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!rawName || !emailNorm) {
      console.log("joinWaitlist validation failed: missing name/email", {
        rawName,
        emailNorm,
      });
      return res.status(400).json({ error: "Name and email are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      console.log("joinWaitlist validation failed: invalid email", {
        emailNorm,
      });
      return res.status(400).json({ error: "Use a valid email" });
    }
    if (rawName.length > 120) {
      console.log("joinWaitlist validation failed: name too long", {
        rawNameLength: rawName.length,
      });
      return res.status(400).json({ error: "Name is too long" });
    }

    const firstName = rawName.split(" ")[0];
    const first = firstName;

    const existing = await Waitlist.findOne({ email: emailNorm });
    if (existing) {
      if (existing.name !== rawName) {
        existing.name = rawName;
        await existing.save();
        console.log("joinWaitlist: updated existing name", {
          id: existing._id.toString(),
          email: existing.email,
          name: existing.name,
        });
      } else {
        console.log("joinWaitlist: existing waitlist entry", {
          id: existing._id.toString(),
          email: existing.email,
          name: existing.name,
        });
      }
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({
        message: "Already on waitlist",
        data: { id: existing._id, name: existing.name, email: existing.email },
        meta: { totalSignups, emailSent: false },
      });
    }

    const preCount = await Waitlist.countDocuments();
    const entry = await Waitlist.create({ name: rawName, email: emailNorm });
    const position = preCount + 1;
    const totalSignups = position;
    const refCode = entry._id.toString().slice(-8);
    const shareUrl = `https://inkmity.com/?r=${refCode}`;

    console.log("joinWaitlist: created new entry", {
      id: entry._id.toString(),
      email: entry.email,
      name: entry.name,
      position,
    });

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
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
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
                  alt="Inkmity"
                  width="200"
                  height="200"
                  style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.35));"
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
                  style="border-collapse:separate;border-spacing:0_8px;"
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
      console.error("joinWaitlist: welcome email failed", {
        email: emailNorm,
        error: emailResult.error,
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
  } catch (err) {
    console.error("joinWaitlist error:", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      raw: err,
    });
    if (err?.code === 11000) {
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
      stack: err?.stack,
      raw: err,
    });
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}