import cloudinary from "./cloudinary.js";

export function signUpload(folder, extraParams = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder, ...extraParams };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );
  return {
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    paramsToSign,
  };
}
