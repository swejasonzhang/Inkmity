import { useAuth } from "@clerk/clerk-react";

export const API_URL: string =
  (import.meta as any)?.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_URL ||
  "http://localhost:5005/api";

async function withAuthHeaders(init: RequestInit = {}, token?: string) {
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include" as const,
  };
}

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, await withAuthHeaders(init, token));
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const err = new Error(text || res.statusText);
    // @ts-expect-error augment
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json")
    ? (JSON.parse(text) as T)
    : (text as unknown as T);
}

export async function apiGet<T = any>(
  path: string,
  params?: Record<string, any>,
  token?: string
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
  return apiRequest<T>(`${path}${qs}`, { method: "GET" }, token);
}

export async function apiPost<T = any>(
  path: string,
  body?: any,
  token?: string
) {
  return apiRequest<T>(
    path,
    { method: "POST", body: body ? JSON.stringify(body) : undefined },
    token
  );
}

export function useApi() {
  const { getToken, isSignedIn } = useAuth();
  async function request(path: string, init: RequestInit = {}) {
    const raw = isSignedIn ? await getToken() : undefined;
    const token = raw ?? undefined;
    return apiRequest(path, init, token);
  }
  return { request, API_URL };
}

export type Availability = {
  timezone: string;
  weekly: { [weekday: string]: Array<{ start: string; end: string }> };
  exceptions?: Array<{
    date: string;
    slots: Array<{ start: string; end: string }>;
  }>;
};

export async function getAvailability(artistId: string, token?: string) {
  return apiGet<Availability>("/availability", { artistId }, token);
}

export async function checkUsername(u: string) {
  return apiGet<
    | { ok: true; available: boolean; username: string }
    | { ok: false; error: string }
  >("/users/username-availability", { u });
}