import express from "express";
const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  console.log("[CONTACT] ->", {
    name,
    email,
    subject,
    message,
    at: new Date().toISOString(),
  });
  return res.json({ ok: true });
});

export default router;