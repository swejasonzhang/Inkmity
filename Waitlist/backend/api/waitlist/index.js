import connectDB from "../../config/db.js";
import { joinWaitlist } from "../../controllers/waitlistController.js";
import Waitlist from "../../models/Waitlist.js";
import { errorHandler } from "../../utils/errorHandler.js";

export default async function handler(req, res) {
  await connectDB();

  const allowedOrigins = [
    "https://inkmity.com",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "POST") {
      return await joinWaitlist(req, res);
    }

    if (req.method === "GET") {
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({ totalSignups });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("❌ API Error:", err.message);

    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "This email is already on the waitlist 🖤" });
    }

    errorHandler
      ? errorHandler(err, res)
      : res.status(500).json({ error: "Server error" });
  }
}
