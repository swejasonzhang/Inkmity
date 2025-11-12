import Waitlist from "../models/Waitlist.js";
import { sendWelcomeEmail } from "../config/email.js";

export const getTotalSignups = async (req, res, next) => {
  try {
    const totalSignups = await Waitlist.countDocuments();
    res.status(200).json({ totalSignups });
  } catch (err) {
    next(err);
  }
};

export const joinWaitlist = async (req, res) => {
  try {
    const rawName = String(req.body?.name ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const emailNorm = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!rawName || !emailNorm)
      return res.status(400).json({ error: "Name and email are required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm))
      return res.status(400).json({ error: "Use a valid email" });
    if (rawName.length > 120)
      return res.status(400).json({ error: "Name is too long" });

    const first = rawName.split(" ")[0];

    const existing = await Waitlist.findOne({ email: emailNorm });
    if (existing) {
      if (existing.name !== rawName) {
        existing.name = rawName;
        await existing.save();
      }
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({
        message: "Already on waitlist",
        data: { id: existing._id, name: existing.name, email: existing.email },
        meta: { totalSignups },
      });
    }

    const preCount = await Waitlist.countDocuments();
    const entry = await Waitlist.create({ name: rawName, email: emailNorm });
    const position = preCount + 1;
    const totalSignups = position;

    const refCode = entry._id.toString().slice(-8);
    const shareUrl = `https://inkmity.com/?r=${refCode}`;

    try {
      await sendWelcomeEmail({
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
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Welcome to Inkmity</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;text-align:center;">
    <div style="width:100%;background:#ffffff;margin:0;padding:0;text-align:center;">

      <!-- Card container -->
      <div style="padding:32px 16px;display:flex;justify-content:center;align-items:center;text-align:center;">
        <div style="max-width:560px;width:100%;margin:0 auto;background:linear-gradient(180deg,#f3f4f6,#e5e7eb);border:1px solid #d1d5db;border-radius:16px;overflow:hidden;text-align:center;">

          <div style="padding:40px 28px 16px;text-align:center;">
            <h2 style="margin:0 0 12px;font-size:24px;line-height:1.35;color:#111827;text-align:center;">Hi ${first}, you’re in.</h2>
          </div>

          <div style="padding:0 28px;text-align:center;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#111827;text-align:center;">
              We’re building a reliable, high-quality experience to <strong>discover artists</strong>, keep every <strong>message and reference</strong> in one place, and <strong>book with zero guesswork</strong> on price or availability.
            </p>
          </div>

          <div style="padding:0 28px;text-align:center;">
            <p style="margin:0 8px 8px;font-size:13px;line-height:1.6;color:#111827;text-align:center;">• Thoughtful discovery for style and budget</p>
            <p style="margin:0 8px 8px;font-size:13px;line-height:1.6;color:#111827;text-align:center;">• One thread for messages and references</p>
            <p style="margin:0 8px 8px;font-size:13px;line-height:1.6;color:#111827;text-align:center;">• Clear pricing, availability, and booking</p>
          </div>

          <div style="padding:0 28px 8px;text-align:center;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#111827;text-align:center;">We’ll email you when early access opens. No spam.</p>
          </div>

          <div style="height:40px;line-height:40px;font-size:0;text-align:center;">&nbsp;</div>

          <div style="padding:16px 28px 36px;border-top:1px solid #d1d5db;text-align:center;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#374151;text-align:center;">© ${new Date().getFullYear()} Inkmity. All rights reserved.</p>
          </div>

        </div>
      </div>
    </div>
  </body>
</html>`,
      });
    } catch {}

    return res.status(201).json({
      message: "Added to waitlist",
      data: { id: entry._id, name: entry.name, email: entry.email },
      meta: { position, totalSignups, refCode, shareUrl },
    });
  } catch (err) {
    if (err?.code === 11000)
      return res.status(200).json({ message: "Already on waitlist" });
    return res
      .status(500)
      .json({ error: "Server error, please try again later" });
  }
};
