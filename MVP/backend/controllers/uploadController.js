import cloudinary from "../lib/cloudinary.js";

export const getAvatarSignature = async (_req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "inkmity/avatars";

    const paramsToSign = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create signature" });
  }
};