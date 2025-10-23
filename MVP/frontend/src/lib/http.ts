const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_URL ||
  "http://localhost:5005/api";

function buildUrl(path: string, params?: Record<string, any>) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  if (!params) return url;
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `${url}?${qs}` : url;
}

export async function http<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string,
  query?: Record<string, any>
): Promise<T> {
  const url = buildUrl(path, query);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  const text = await res.text().catch(() => "");
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const err = new Error(text || res.statusText);
    (err as any).status = res.status;
    throw err;
  }
  return ct.includes("application/json")
    ? (JSON.parse(text) as T)
    : (text as unknown as T);
}

export { API_URL };