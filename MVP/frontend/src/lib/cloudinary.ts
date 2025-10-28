const RAW_API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_URL) ||
  "http://localhost:5005/api";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export async function getSignedUpload(kind: "client_ref" | "artist_portfolio") {
  const qs = new URLSearchParams({ kind }).toString();
  const res = await fetch(`${API_BASE}/images/sign?${qs}`, {
    method: "GET",
    credentials: "include",
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
) {
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