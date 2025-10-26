const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_URL) ||
  "http://localhost:5005/api";

type SignResp = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  tags?: string;
};

export async function getSignedUpload(
  kind: "client_ref" | "artist_portfolio"
): Promise<SignResp> {
  const url = `${API_BASE.replace(
    /\/+$/,
    ""
  )}/uploads/sign?kind=${encodeURIComponent(kind)}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok)
    throw new Error(`sign failed ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as SignResp;
  if (!json.signature || !json.cloudName || !json.apiKey)
    throw new Error("invalid sign payload");
  return json;
}

type UploadOut = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  url?: string;
  tags?: string[];
};

export async function uploadToCloudinary(
  file: File,
  sig: SignResp
): Promise<UploadOut> {
  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  if (sig.folder) fd.append("folder", sig.folder);
  if (sig.tags) fd.append("tags", sig.tags);

  const res = await fetch(endpoint, { method: "POST", body: fd });
  if (!res.ok)
    throw new Error(`cloudinary upload ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as UploadOut;
  if (!data.public_id || !(data.secure_url || data.url))
    throw new Error("upload response missing ids");
  return data;
}