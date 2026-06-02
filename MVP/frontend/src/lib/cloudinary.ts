import { API_URL as API_BASE } from "@/api";

const ENV: any = (import.meta as any)?.env ?? {};
const CLOUD_NAME = (ENV.VITE_CLOUDINARY_CLOUD_NAME as string) || "";
const UPLOAD_PRESET = (ENV.VITE_CLOUDINARY_UPLOAD_PRESET as string) || "";

type UploadResult = { url: string; publicId: string };

export async function uploadUnsigned(file: File): Promise<UploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Image uploads are not configured");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let msg = "Upload failed";
    try {
      const j = await res.json();
      msg = j?.error?.message || msg;
    } catch {
      msg = "Upload failed";
    }
    throw new Error(msg);
  }
  const json = await res.json();
  return { url: json.secure_url, publicId: json.public_id };
}

/** Server-signed upload — for authenticated contexts (dashboard, messaging). */
export async function getSignedUpload(kind: "client_ref" | "artist_portfolio", token?: string) {
  const qs = new URLSearchParams({ kind }).toString();
  const res = await fetch(`${API_BASE}/images/sign?${qs}`, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("signature_failed");
  return res.json() as Promise<{
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
    tags?: string;
  }>;
}

export async function uploadToCloudinary(
  file: File,
  sig: {
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
    tags?: string;
  }
): Promise<any> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  if (sig.tags) form.append("tags", sig.tags);
  const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
  const up = await fetch(url, { method: "POST", body: form });
  if (!up.ok) throw new Error("upload_failed");
  return up.json();
}
