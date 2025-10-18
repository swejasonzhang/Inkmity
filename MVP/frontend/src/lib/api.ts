const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:5005/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, qs?: Record<string, string>) {
  const url = new URL(`${API_BASE}${path}`);
  if (qs) Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: HeadersInit = { ...authHeaders() };
  const res = await fetch(url.toString(), {
    credentials: "include",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body?: any) {
  const headers: HeadersInit = {
    ...authHeaders(),
    "Content-Type": "application/json",
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPut<T>(path: string, body?: any) {
  const headers: HeadersInit = {
    ...authHeaders(),
    "Content-Type": "application/json",
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string, body?: any) {
  const headers: HeadersInit = {
    ...authHeaders(),
    "Content-Type": "application/json",
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}