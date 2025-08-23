import Waitlist from "../models/Waitlist.js";
import { sendWelcomeEmail } from "../config/email.js";

export const joinWaitlist = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const exists = await Waitlist.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const entry = await Waitlist.create({ name, email });

    try {
      await sendWelcomeEmail({
        to: email,
        subject: "Welcome to For The Love Of Tattoos Waitlist 🎉",
        text: `Hi ${name}, thanks for joining our waitlist! We'll keep you updated.`,
        html: `<h2>Hi ${name},</h2><p>Thanks for joining our waitlist! We'll keep you updated on launch 🚀</p>`,
      });
    } catch (emailErr) {
      console.error("❌ Failed to send email:", emailErr.message);
    }

    res.status(201).json({ message: "Added to waitlist", data: entry });
  } catch (err) {
    console.error("❌ Join waitlist error:", err.message);
    res.status(500).json({ error: "Server error, please try again later" });
  }
};
