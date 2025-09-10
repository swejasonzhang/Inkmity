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
      return res.status(400).json({ error: "Email already registered 🖤" });
    }

    const entry = await Waitlist.create({ name, email });

    try {
      await sendWelcomeEmail({
        to: email,
        subject: "Welcome to Inkmity!",
        text: `Hi ${name},

Welcome to Inkmity! We're thrilled to have you join our community.

Discover talented tattoo artists near you, explore unique designs, and bring your tattoo ideas to life with guidance and inspiration.

Your journey into the world of tattoos starts here! 🚀

With inked love,
Inkmity`,
        html: `<h2>Hi ${name},</h2>
<p>Welcome to <strong>Inkmity</strong>! We're thrilled to have you join our community.</p>
<p>With Inkmity, you can:</p>
<ul>
  <li>Discover talented tattoo artists near you</li>
  <li>Explore unique tattoo designs</li>
  <li>Bring your tattoo ideas to life with guidance and inspiration</li>
</ul>
<p>Your journey into the world of tattoos starts here! 🚀</p>
<p style="margin-top:20px;">With inked love,<br>
<strong>Inkmity</strong></p>`,
      });

      console.log("✅ Welcome email sent to", email);
    } catch (emailErr) {
      console.error("❌ Failed to send email:", emailErr.message);
    }

    res.status(201).json({ message: "Added to waitlist", data: entry });
  } catch (err) {
    console.error("❌ Join waitlist error:", err.message);
    res.status(500).json({ error: "Server error, please try again later" });
  }
};
