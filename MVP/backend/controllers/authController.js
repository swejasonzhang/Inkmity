import { clerkClient } from "@clerk/clerk-sdk-node";

export const checkEmail = async (req, res) => {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ error: "Missing email" });
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    return res.json({ exists: (users?.length ?? 0) > 0 });
  } catch {
    return res.status(500).json({ error: "Internal error" });
  }
};