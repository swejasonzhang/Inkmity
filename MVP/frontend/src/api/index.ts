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
  bookingId?: string;
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
  status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show" | "booked" | "matched" | "accepted" | "denied";
  appointmentType?: "consultation" | "tattoo_session";
  projectId?: string;
  sessionNumber?: number;
  intakeFormId?: string;
  referenceImageIds?: string[];
  rescheduleNoticeHours?: number;
  noShowMarkedAt?: string;
  noShowMarkedBy?: "client" | "artist" | "system";
  priceCents?: number;
  depositRequiredCents?: number;
  depositPaidCents?: number;
  rescheduledFrom?: string;
  rescheduledAt?: string;
  rescheduledBy?: "client" | "artist";
  confirmedAt?: string;
  cancelledAt?: string;
  cancelledBy?: "client" | "artist" | "system";
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type IntakeForm = {
  _id: string;
  bookingId: string;
  clientId: string;
  artistId: string;
  healthInfo: {
    allergies?: string;
    medications?: string;
    medicalConditions?: string;
    skinConditions?: string;
    bloodThinners?: boolean;
    pregnant?: boolean;
    recentSurgery?: boolean;
    recentSurgeryDetails?: string;
  };
  tattooDetails: {
    placement?: string;
    size?: string;
    style?: string;
    description?: string;
    isCoverUp?: boolean;
    isTouchUp?: boolean;
  };
  consent: {
    ageVerification: boolean;
    healthDisclosure: boolean;
    aftercareInstructions: boolean;
    photoRelease?: boolean;
    depositPolicy: boolean;
    cancellationPolicy: boolean;
  };
  emergencyContact: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  additionalNotes?: string;
  submittedAt: string;
};

export type Project = {
  _id: string;
  artistId: string;
  clientId: string;
  name: string;
  description?: string;
  placement?: string;
  estimatedSessions: number;
  completedSessions: number;
  totalPriceCents?: number;
  depositPaidCents?: number;
  status: "active" | "completed" | "cancelled" | "on_hold";
  startedAt?: string;
  completedAt?: string;
  referenceImageIds?: string[];
  artistNotes?: string;
  clientNotes?: string;
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

export async function checkoutDeposit(
  bookingId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<{
    url?: string;
    id?: string;
    clientSecret?: string;
  }>("/billing/deposit", { bookingId }, token, signal);
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

export async function updateVisibility(
  visibility: "online" | "away" | "invisible",
  token?: string,
  signal?: AbortSignal
) {
  return apiRequest<{ ok: boolean; visibility: string }>(
    "/users/me/visibility",
    { method: "PUT", body: JSON.stringify({ visibility }), signal },
    token
  );
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

export async function createConsultation(
  input: {
    artistId: string;
    startISO: string;
    durationMinutes?: number;
    priceCents?: number;
    note?: string;
  },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>("/bookings/consultation", input, token, signal);
}

export async function createTattooSession(
  input: {
    artistId: string;
    startISO: string;
    durationMinutes?: number;
    priceCents?: number;
    projectId?: string;
    sessionNumber?: number;
    referenceImageIds?: string[];
    note?: string;
  },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>("/bookings/session", input, token, signal);
}

export async function rescheduleAppointment(
  id: string,
  input: {
    startISO: string;
    endISO: string;
    reason?: string;
  },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/reschedule`, input, token, signal);
}

export async function getAppointments(
  role?: "client" | "artist",
  token?: string,
  signal?: AbortSignal
) {
  const params = role ? { role } : {};
  return apiGet<Booking[]>("/bookings/appointments", params, token, signal);
}

export async function acceptAppointment(
  id: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/accept`, undefined, token, signal);
}

export async function denyAppointment(
  id: string,
  reason?: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/deny`, reason ? { reason } : undefined, token, signal);
}

export async function markNoShow(
  id: string,
  input?: { reason?: string },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/no-show`, input, token, signal);
}

export async function submitIntakeForm(
  bookingId: string,
  form: Partial<IntakeForm>,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<IntakeForm>(`/bookings/${bookingId}/intake`, form, token, signal);
}

export async function getIntakeForm(
  bookingId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<IntakeForm>(`/bookings/${bookingId}/intake`, undefined, token, signal);
}

export async function getAppointmentDetails(
  id: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<Booking & { client?: any; artist?: any }>(
    `/bookings/${id}/details`,
    undefined,
    token,
    signal
  );
}

export async function createDepositPaymentIntent(
  bookingId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<{
    clientSecret: string;
    paymentIntentId: string;
    billingId: string;
  }>("/billing/deposit/intent", { bookingId }, token, signal);
}

export type ArtistPolicy = {
  _id?: string;
  artistId: string;
  deposit?: {
    mode?: "percent" | "flat";
    percent?: number;
    amountCents?: number;
    minCents?: number;
    maxCents?: number;
    nonRefundable?: boolean;
    cutoffHours?: number;
  };
  bookingEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getArtistPolicy(artistId: string, signal?: AbortSignal) {
  return apiGet<ArtistPolicy>(`/artist-policy/${artistId}`, undefined, undefined, signal);
}

export async function updateArtistPolicy(
  artistId: string,
  deposit: NonNullable<ArtistPolicy["deposit"]>,
  bookingEnabled?: boolean,
  token?: string,
  signal?: AbortSignal
) {
  return apiRequest<ArtistPolicy>(
    `/artist-policy/${artistId}`,
    { method: "PUT", body: JSON.stringify({ deposit, bookingEnabled }), signal },
    token
  );
}

export type BookingGate = {
  enabled: boolean;
  depositConfigured: boolean;
  message: string;
};

export async function getBookingGate(artistId: string, clientId?: string, signal?: AbortSignal) {
  const params = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  return apiGet<BookingGate>(`/artist-policy/${artistId}/booking-gate${params}`, undefined, undefined, signal);
}

export async function enableClientBookings(
  artistId: string,
  clientId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<{ ok: boolean; permission?: any; message?: string }>(
    "/artist-policy/enable-client-bookings",
    { artistId, clientId },
    token,
    signal
  );
}

export type ConsultationStatus = {
  hasCompletedConsultation: boolean;
  consultationDate: string | null;
};

export async function checkConsultationStatus(
  artistId: string,
  clientId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<ConsultationStatus>(
    `/bookings/consultation-status?artistId=${encodeURIComponent(artistId)}&clientId=${encodeURIComponent(clientId)}`,
    undefined,
    token,
    signal
  );
}