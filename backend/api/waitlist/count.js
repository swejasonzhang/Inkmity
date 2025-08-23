import connectDB from "../../config/db.js";
import Waitlist from "../../models/Waitlist.js";

connectDB();

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({ totalSignups });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Server error. Please try again later." });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}