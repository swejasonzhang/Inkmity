import connectDB from "../../config/db.js";
import Waitlist from "../../models/Waitlist.js";

connectDB();

export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://fortheloveoftattoos.vercel.app"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "POST") {
      const { name, email } = req.body;
      if (!name || !email)
        return res.status(400).json({ error: "Name and email required" });

      const newEntry = await Waitlist.create({ name, email });
      return res.status(201).json({ message: "User added!", data: newEntry });
    }

    if (req.method === "GET") {
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({ totalSignups });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    errorHandler(err, res);
  }
}
