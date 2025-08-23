import connectDB from "../../config/db.js";
import Waitlist from "../../models/Waitlist.js";

connectDB();

export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://fortheloveoftattoos.vercel.app"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({ totalSignups });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
