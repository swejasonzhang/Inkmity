import connectDB from "../../config/db.js";
import Waitlist from "../../models/Waitlist.js";

connectDB();

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required." });
      }

      const newEntry = await Waitlist.create({ name, email });
      return res
        .status(201)
        .json({ message: "User added to waitlist!", data: newEntry });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Server error. Please try again later." });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}