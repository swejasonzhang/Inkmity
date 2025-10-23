import { useAuth } from "@clerk/clerk-react";

export const API_URL: string =
  (import.meta as any)?.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_URL ||
  "http://localhost:5005/api";

function isAbortError(e: unknown): e is DOMException & { name: "AbortError" } {
  return !!e && typeof e === "object" && (e as any).name === "AbortError";
}

async function withAuthHeaders(
  init: RequestInit = {},
  token?: string
): Promise<RequestInit> {
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  };
}

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const req = await withAuthHeaders(init, token);
  console.log("[api] →", req.method || "GET", url, req);

  let res: Response;
  try {
    res = await fetch(url, req);
  } catch (e) {
    if (isAbortError(e)) {
      console.debug("[api] aborted:", url);
      throw e;
    }
    console.error("[api] network error:", e);
    throw e;
  }

  const text = await res.text().catch(() => "");
  const ct = res.headers.get("content-type") || "";
  console.log("[api] ←", res.status, res.statusText, url, {
    bodyPreview: text.slice(0, 300),
  });

  if (!res.ok) {
    const err = new Error(text || res.statusText);
    (err as any).status = res.status;
    throw err;
  }

  return ct.includes("application/json")
    ? (JSON.parse(text) as T)
    : (text as unknown as T);
}

export async function apiGet<T = any>(
  path: string,
  params?: Record<string, any>,
  token?: string,
  signal?: AbortSignal
) {
  const qs =
    params && Object.keys(params).length
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(
              ([, v]) => v !== undefined && v !== null && v !== ""
            )
          )
        ).toString()}`
      : "";
  return apiRequest<T>(`${path}${qs}`, { method: "GET", signal }, token);
}

export async function apiPost<T = any>(
  path: string,
  body?: any,
  token?: string,
  signal?: AbortSignal
) {
  return apiRequest<T>(
    path,
    { method: "POST", body: body ? JSON.stringify(body) : undefined, signal },
    token
  );
}

export function useApi() {
  const { getToken, isSignedIn } = useAuth();
  async function request(path: string, init: RequestInit = {}) {
    const tok = isSignedIn ? (await getToken()) ?? undefined : undefined;
    return apiRequest(path, init, tok);
  }
  return { request, API_URL };
}

export { isAbortError };