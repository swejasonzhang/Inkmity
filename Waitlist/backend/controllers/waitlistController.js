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

    const firstName = rawName.split(" ")[0];

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
        subject: `${firstName}, you’re on the Inkmity waitlist`,
        text: `Hi ${firstName},

Welcome to Inkmity — you’re #${position} in line.

We’ll email you at launch. Share your link:
${shareUrl}

With inked love,
Inkmity`,
        html: `<h2>Hi ${firstName},</h2>
<p>Welcome to <strong>Inkmity</strong> — you’re <strong>#${position}</strong> in line.</p>
<p>We’ll email you at launch. Share your link:</p>
<p><a href="${shareUrl}" target="_blank" rel="noopener noreferrer">${shareUrl}</a></p>
<p style="margin-top:20px;">With inked love,<br><strong>Inkmity</strong></p>`,
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