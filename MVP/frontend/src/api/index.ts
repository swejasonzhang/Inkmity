import { useAuth } from "@clerk/clerk-react";

export const API_URL: string =
  (import.meta as any)?.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_URL ||
  "http://localhost:5005";

export function isAbortError(
  e: unknown
): e is DOMException & { name: "AbortError" } {
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

function buildUrl(path: string, params?: Record<string, any>) {
  const base = API_URL.replace(/\/+$/, "");
  const url = path.startsWith("http")
    ? path.replace(/\/+$/, "")
    : `${base}/${path.replace(/^\/+/, "")}`;
  if (!params || !Object.keys(params).length) return url;
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    )
  ).toString();
  return qs ? `${url}?${qs}` : url;
}

const isDev = import.meta.env.MODE === "development" || import.meta.env.DEV;

async function apiRequestWithRetry<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string,
  retryCount = 0
): Promise<T> {
  const req = await withAuthHeaders(init, token);
  let res: Response;
  const url = buildUrl(path);
  
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
    if (res.status === 429 && isDev && retryCount < 3) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return apiRequestWithRetry<T>(path, init, token, retryCount + 1);
    }
    
    const body = parsed ?? (text ? { message: text } : undefined);
    const message =
      (body as any)?.message ||
      (body as any)?.error ||
      res.statusText ||
      "Request failed";
    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).body = body;
    (err as any).url = url;
    (err as any).headers = headersObj;
    (err as any).requestId = requestId;
    
    if (res.status === 429) {
      if (!isDev || retryCount >= 3) {
        console.warn(`[apiRequest] Rate limited (429) - ${url}. Too many requests to this endpoint.`);
      }
    } else {
      const errorDetails = {
        url,
        status: res.status,
        statusText: res.statusText,
        body,
        headers: headersObj,
        requestId,
      };
      console.error("[apiRequest] http error", errorDetails);
      console.error(`[apiRequest] ${res.status} ${res.statusText} - ${url}`, body || "(no body)");
    }
    throw err;
  }

  if (parsed !== undefined) return parsed as T;
  return text as unknown as T;
}

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  return apiRequestWithRetry<T>(path, init, token, 0);
}

export async function apiGet<T = any>(
  path: string,
  params?: Record<string, any>,
  token?: string,
  signal?: AbortSignal
) {
  return apiRequest<T>(
    buildUrl(path, params),
    { method: "GET", signal },
    token
  );
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

export type Artist = {
  _id: string;
  clerkId: string;
  username: string;
  location?: string;
  styles?: string[];
  yearsExperience?: number;
  baseRate?: number;
  rating?: number;
  reviewsCount?: number;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  avatarUrl?: string;
  profileImage?: string;
  avatar?: { url?: string; publicId?: string; alt?: string; width?: number; height?: number };
  createdAt?: string;
};

export interface DashboardArtist {
  id: string;
  name: string;
  location: string;
  style: string;
  priceRange: string;
  rating: number;
}

export type ReviewInput = {
  artistClerkId: string;
  rating: number;
  text?: string;
};

export type MessageDTO = {
  senderId?: string;
  receiverId: string;
  text: string;
  budgetCents?: number;
  style?: string;
  targetDateISO?: string;
  referenceUrls?: string[];
};

export type ConversationMessage = {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
};

export type ConversationDTO = {
  participantId: string;
  username: string;
  messages: ConversationMessage[];
};

export type Booking = {
  _id: string;
  artistId: string;
  clientId: string;
  serviceId?: string;
  startAt: string;
  endAt: string;
  note?: string;
  status: "booked" | "cancelled" | "completed" | "pending";
};

export type Me = {
  _id: string;
  clerkId: string;
  role: "client" | "artist";
  username: string;
};

export async function fetchArtists(
  filters: Record<string, any>,
  signal?: AbortSignal
) {
  return apiGet<{
    items: Artist[];
    total: number;
    page: number;
    pageSize: number;
  }>("/users/artists", filters, undefined, signal);
}

export async function fetchArtistById(id: string, signal?: AbortSignal) {
  return apiGet<Artist>(`/users/artists/${id}`, undefined, undefined, signal);
}

export async function getDashboardData(token?: string, signal?: AbortSignal) {
  return apiGet<{ featuredArtists: DashboardArtist[] }>(
    "/dashboard",
    undefined,
    token,
    signal
  );
}

export async function addReview(
  token: string | undefined,
  reviewData: ReviewInput,
  signal?: AbortSignal
) {
  return apiPost("/reviews", reviewData, token, signal);
}

export async function fetchConversations(
  token: string | undefined,
  userId: string,
  signal?: AbortSignal
) {
  return apiGet<ConversationDTO[]>(
    `/messages/user/${userId}`,
    undefined,
    token,
    signal
  );
}

export async function sendMessage(
  token: string | undefined,
  data: MessageDTO,
  signal?: AbortSignal
) {
  return apiPost("/messages", data, token, signal);
}

export async function deleteConversation(
  token: string | undefined,
  userId: string,
  participantId: string,
  signal?: AbortSignal
) {
  return apiRequest(
    "/messages/conversations",
    {
      method: "DELETE",
      body: JSON.stringify({ userId, participantId }),
      signal,
    },
    token
  );
}

export async function listBookingsForDay(
  artistId: string,
  dateISO: string,
  signal?: AbortSignal
) {
  return apiGet<Booking[]>(
    "/bookings",
    { artistId, date: dateISO },
    undefined,
    signal
  );
}

export async function createBooking(
  input: {
    artistId: string;
    clientId: string;
    serviceId?: string;
    startISO: string;
    endISO: string;
    note?: string;
  },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>(
    "/bookings",
    {
      artistId: input.artistId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      startAt: input.startISO,
      endAt: input.endISO,
      note: input.note,
    },
    token,
    signal
  );
}

export async function cancelBooking(
  id: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/cancel`, undefined, token, signal);
}

export async function completeBooking(
  id: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/complete`, undefined, token, signal);
}

export async function getBooking(
  id: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<Booking>(`/bookings/${id}`, undefined, token, signal);
}

export async function startCheckout(
  bookingId: string,
  label?: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<{
    ok?: boolean;
    mode?: "free";
    url?: string;
    billingId?: string;
  }>("/billing/checkout", { bookingId, label }, token, signal);
}

export async function refundByBooking(
  bookingId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<{ ok: boolean }>(
    "/billing/refund",
    { bookingId },
    token,
    signal
  );
}

export async function getMe(opts?: { token?: string; signal?: AbortSignal }) {
  return apiGet<Me>("/users/me", undefined, opts?.token, opts?.signal);
}

export async function syncUser(
  token: string | undefined,
  payload: {
    clerkId: string;
    email: string;
    role: "client" | "artist";
    username: string;
    firstName?: string;
    lastName?: string;
    profile: Record<string, any>;
  },
  signal?: AbortSignal
) {
  return apiPost("/users/sync", payload, token, signal);
}