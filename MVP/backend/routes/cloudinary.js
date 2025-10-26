const express = require("express");
const cloudinary = require("cloudinary");

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const r = express.Router();

r.post("/cloudinary/sign", (req, res) => {
  const { folder, tags } = req.body || {};
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  if (Array.isArray(tags) && tags.length) paramsToSign.tags = tags.join(",");
  const signature = cloudinary.v2.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );
  res.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

r.post("/images/save", async (req, res) => {
  const { files, role, kind, userId } = req.body || {};
  res.json({ ok: true, count: Array.isArray(files) ? files.length : 0 });
});

module.exports = r;