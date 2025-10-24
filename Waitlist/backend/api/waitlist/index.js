export default async function handler(req, res) {
  await connectDB();

  const isProd = process.env.NODE_ENV === "production";
  const allowedOrigins = [
    "https://inkmity.com",
    "https://inkmity-backend.vercel.app",
  ];

  const origin = req.headers.origin;

  const allowOrigin =
    !isProd && origin?.startsWith("http://localhost:")
      ? origin
      : allowedOrigins.includes(origin)
      ? origin
      : null;

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  }
  res.setHeader("Vary", "Origin"); // caches per-origin
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "POST") return await joinWaitlist(req, res);
    if (req.method === "GET") {
      const totalSignups = await Waitlist.countDocuments();
      return res.status(200).json({ totalSignups });
    }
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("❌ API Error:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "This email is already on the waitlist 🖤" });
    }
    return res.status(500).json({ error: "Server error" });
  }
}