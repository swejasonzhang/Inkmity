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

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const base = API_URL.replace(/\/+$/, "");
  const url = path.startsWith("http")
    ? path.replace(/\/+$/, "")
    : `${base}/${path.replace(/^\/+/, "")}`;
  const req = await withAuthHeaders(init, token);

  let res: Response;
  try {
    res = await fetch(url, req);
  } catch (e) {
    if (isAbortError(e)) throw e;
    console.error("[apiRequest] fetch failed", { url, init: req, error: e });
    throw e;
  }

  const text = await res.text().catch(() => "");
  const ct = res.headers.get("content-type") || "";
  const requestId = res.headers.get("x-request-id") || undefined;
  const headersObj = Object.fromEntries([...res.headers.entries()]);
  const parsed = ct.includes("application/json") ? safeParse(text) : undefined;

  if (!res.ok) {
    const body = parsed ?? (text ? { message: text } : undefined);
    const err = new Error(
      (body as any)?.message || res.statusText || "Request failed"
    );
    (err as any).status = res.status;
    (err as any).body = body;
    (err as any).url = url;
    (err as any).headers = headersObj;
    (err as any).requestId = requestId;
    console.error("[apiRequest] http error", {
      url,
      status: res.status,
      body,
      headers: headersObj,
      requestId,
    });
    throw err;
  }

  if (parsed !== undefined) return parsed as T;
  return text as unknown as T;
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