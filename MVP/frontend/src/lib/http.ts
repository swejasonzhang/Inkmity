const RAW_API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  (import.meta as any)?.env?.VITE_API_BASE ||
  import.meta.env?.VITE_API_URL ||
  "http://localhost:5005/api";

export const API_URL = String(RAW_API_URL).replace(/\/+$/, "");

function buildQuery(params?: Record<string, any>) {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) qs.append(k, String(item));
    } else if (typeof v === "object") {
      qs.append(k, JSON.stringify(v));
    } else {
      qs.append(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function buildUrl(path: string, params?: Record<string, any>) {
  if (/^https?:\/\//i.test(path)) return path + buildQuery(params);
  const clean = path.replace(/^\/+/, "");
  return `${API_URL}/${clean}${buildQuery(params)}`;
}

export async function http<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string,
  query?: Record<string, any>
): Promise<T> {
  const url = buildUrl(path, query);
  const res = await fetch(url, {
    method: init.method || "GET",
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    const err = new Error(text || res.statusText);
    (err as any).status = res.status;
    throw err;
  }

  if (contentType.includes("application/json")) {
    return (text ? JSON.parse(text) : {}) as T;
  }
  return text as unknown as T;
}