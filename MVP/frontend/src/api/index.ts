import { useAuth } from "@clerk/clerk-react";
import { env } from "@/utils/env";
import { logger } from "@/utils/logger";

export const API_URL: string = env.apiUrl;

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

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const req = await withAuthHeaders(init, token);
  let res: Response;
  const url = buildUrl(path);
  try {
    res = await fetch(url, req);
  } catch (e) {
    if (isAbortError(e)) throw e;
    logger.error("API request fetch failed", { url, error: e });
    throw e;
  }

  const text = await res.text().catch(() => "");
  const ct = res.headers.get("content-type") || "";
  const requestId = res.headers.get("x-request-id") || undefined;
  const headersObj = Object.fromEntries([...res.headers.entries()]);
  const parsed = ct.includes("application/json") ? safeParse(text) : undefined;

  if (!res.ok) {
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
    logger.error("API request http error", {
      url,
      status: res.status,
      body,
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
  status: "booked" | "matched" | "cancelled" | "completed" | "pending";
  priceCents?: number;
  depositRequiredCents?: number;
  depositPaidCents?: number;
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

export async function getBookingsForArtist(
  artistId?: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<Booking[]>(
    "/bookings/artist",
    artistId ? { artistId } : {},
    token,
    signal
  );
}

export async function getBookingsForClient(
  clientId?: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<Booking[]>(
    "/bookings/client",
    clientId ? { clientId } : {},
    token,
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
      startISO: input.startISO,
      endISO: input.endISO,
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