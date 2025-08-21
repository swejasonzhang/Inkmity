import Waitlist from "../models/Waitlist.js";
import { sendWelcomeEmail } from "../config/email.js";

export const joinWaitlist = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const exists = await Waitlist.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const entry = await Waitlist.create({ name, email });

    await sendWelcomeEmail({
      to: email,
      subject: "Welcome to the Tattoo Platform Waitlist 🎉",
      text: `Hi ${name}, thanks for joining our waitlist! We'll keep you updated.`,
      html: `<h2>Hi ${name},</h2><p>Thanks for joining our waitlist! We'll keep you updated on launch 🚀</p>`,
    });

    res.status(201).json({ message: "Added to waitlist", data: entry });
  } catch (err) {
    next(err);
  }
};
