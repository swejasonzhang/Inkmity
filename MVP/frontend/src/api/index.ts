import { useAuth } from "@clerk/clerk-react";

export const API_URL: string = (
  (import.meta as any)?.env?.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/+$/, "");

export function buildUrl(path: string, params?: Record<string, any>) {
  if (/^https?:\/\//i.test(path)) return path + (params ? buildQuery(params) : "");
  const clean = path.replace(/^\/+/, "");
  return `${API_URL}/${clean}${params ? buildQuery(params) : ""}`;
}

function buildQuery(params: Record<string, any>): string {
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

export async function apiPatch<T = any>(
  path: string,
  body?: any,
  token?: string,
  signal?: AbortSignal
) {
  return apiRequest<T>(
    path,
    { method: "PATCH", body: body ? JSON.stringify(body) : undefined, signal },
    token
  );
}

export async function apiDelete<T = any>(
  path: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiRequest<T>(path, { method: "DELETE", signal }, token);
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
  handle?: string;
  usernameUpdatedAt?: string;
  onboardingComplete?: boolean;
  portfolioImages?: string[];
  bio?: string;
  avatar?: { url?: string };
  avatarUrl?: string;
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

export async function fetchArtistByHandle(handle: string, signal?: AbortSignal) {
  return apiGet<Artist>(
    `/users/artists/by-handle/${encodeURIComponent(handle.replace(/^@/, ""))}`,
    undefined,
    undefined,
    signal
  );
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

export async function updateMyPortfolio(
  urls: string[],
  token?: string,
  signal?: AbortSignal
) {
  return apiRequest<{ ok: boolean; portfolioImages: string[] }>(
    "/users/me/portfolio",
    { method: "PUT", body: JSON.stringify({ urls }), signal },
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
    consultationFree?: boolean;
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
  payoutsReady?: boolean;
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

export type LegalDocument = {
  docType: string;
  version: string;
  title: string;
  body: string;
  roles: ("client" | "artist" | "studio")[];
  contentHash: string;
};

export async function getDocument(docType: string, signal?: AbortSignal) {
  return apiGet<LegalDocument>(`/documents/${docType}`, undefined, undefined, signal);
}

export async function getSignatureStatus(
  docType: string,
  params?: { bookingId?: string },
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<{ docType: string; version: string; signed: boolean; signedAt: string | null }>(
    `/documents/${docType}/status`,
    params,
    token,
    signal
  );
}

export async function signDocument(
  docType: string,
  input: {
    signatureName: string;
    signerRole: "client" | "artist" | "studio";
    bookingId?: string;
    studioId?: string;
  },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost(`/documents/${docType}/sign`, input, token, signal);
}

export async function listMySignatures(token?: string, signal?: AbortSignal) {
  return apiGet(`/documents/mine`, undefined, token, signal);
}

export type ArtistAnalytics = {
  tier: {
    key: string;
    label: string;
    rank: number;
    verified: boolean;
    payoutSpeed: string;
  };
  rating: number;
  reviewsCount: number;
  bookingsCount: number;
  bookings: {
    total: number;
    completed: number;
    noShow: number;
    cancelled: number;
    completionRate: number;
  };
  earnings: { paidOutCents: number };
  payoutSpeed: string;
};

export async function getArtistAnalytics(token?: string, signal?: AbortSignal) {
  return apiGet<ArtistAnalytics>("/dashboard/artist-analytics", undefined, token, signal);
}

export type ConnectStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
};

export async function getConnectStatus(token?: string, signal?: AbortSignal) {
  return apiGet<ConnectStatus>("/connect/status", undefined, token, signal);
}

export async function startConnectOnboarding(token?: string, signal?: AbortSignal) {
  return apiPost<{ url: string }>("/connect/account-link", undefined, token, signal);
}

export async function getConnectLoginLink(token?: string, signal?: AbortSignal) {
  return apiPost<{ url: string }>("/connect/login-link", undefined, token, signal);
}

export type Studio = {
  _id: string;
  name: string;
  ownerClerkId: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  bio?: string;
  logo?: { url: string; publicId?: string };
  defaultCommissionPct: number;
  verificationStatus?: "pending" | "verified" | "rejected";
  verifiedAt?: string;
  stripeConnectAccountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  active?: boolean;
};

export type StudioMembership = {
  _id: string;
  studioId: string;
  artistClerkId: string;
  role: "owner" | "manager" | "artist";
  status: "invited" | "active" | "declined" | "removed";
  commissionPct: number | null;
  effectiveCommissionPct?: number;
  artist?: {
    clerkId: string;
    username?: string;
    handle?: string;
    avatar?: { url?: string } | null;
  } | null;
  studio?: { _id: string; name: string; city?: string; logo?: any } | null;
};

export async function createStudio(
  input: Partial<Studio>,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<Studio>("/studios", input, token, signal);
}

export async function getMyStudios(token?: string, signal?: AbortSignal) {
  return apiGet<Studio[]>("/studios/mine", undefined, token, signal);
}

export async function getStudio(
  studioId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<Studio>(`/studios/${studioId}`, undefined, token, signal);
}

export async function updateStudio(
  studioId: string,
  patch: Partial<Studio>,
  token?: string,
  signal?: AbortSignal
) {
  return apiPatch<Studio>(`/studios/${studioId}`, patch, token, signal);
}

export async function listStudioMembers(
  studioId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<StudioMembership[]>(
    `/studios/${studioId}/members`,
    undefined,
    token,
    signal
  );
}

export async function inviteArtistToStudio(
  studioId: string,
  input: { handle?: string; artistClerkId?: string; commissionPct?: number | null },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<StudioMembership>(
    `/studios/${studioId}/invite`,
    input,
    token,
    signal
  );
}

export async function updateStudioMember(
  studioId: string,
  artistClerkId: string,
  patch: { commissionPct?: number | null; role?: "manager" | "artist" },
  token?: string,
  signal?: AbortSignal
) {
  return apiPatch<StudioMembership>(
    `/studios/${studioId}/members/${artistClerkId}`,
    patch,
    token,
    signal
  );
}

export async function removeStudioMember(
  studioId: string,
  artistClerkId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiDelete<{ ok: boolean }>(
    `/studios/${studioId}/members/${artistClerkId}`,
    token,
    signal
  );
}

export async function getMyStudioMemberships(
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<StudioMembership[]>(
    "/studios/memberships/mine",
    undefined,
    token,
    signal
  );
}

export async function respondToStudioInvite(
  membershipId: string,
  action: "accept" | "decline",
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<StudioMembership>(
    `/studios/memberships/${membershipId}/respond`,
    { action },
    token,
    signal
  );
}

export async function getStudioConnectStatus(
  studioId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiGet<ConnectStatus>(
    `/studios/${studioId}/connect/status`,
    undefined,
    token,
    signal
  );
}

export async function startStudioConnectOnboarding(
  studioId: string,
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<{ url: string }>(
    `/studios/${studioId}/connect/account-link`,
    undefined,
    token,
    signal
  );
}

export type RewardsSummary = {
  completedBookings: number;
  tier: { key: string; label: string; feePct: number };
  nextTier: {
    key: string;
    label: string;
    feePct: number;
    bookingsToNextTier: number;
  } | null;
  currentFeePct: number;
  platformFeeMinCents: number;
  totalFeesPaidCents: number;
  lifetimeDiscountUsd: number;
};

export async function getMyRewards(token?: string, signal?: AbortSignal) {
  return apiGet<RewardsSummary>("/rewards/me", undefined, token, signal);
}

export async function getMyCredits(token?: string, signal?: AbortSignal) {
  return apiGet<{ availableCents: number }>("/rewards/credits", undefined, token, signal);
}

export type WaitlistEntry = {
  _id: string;
  artistId: string;
  clientId: string;
  status: "active" | "notified" | "claimed" | "cancelled" | "expired";
  createdAt?: string;
};

export async function joinWaitlist(
  input: { artistId: string; fromISO?: string; toISO?: string; note?: string },
  token?: string,
  signal?: AbortSignal
) {
  return apiPost<WaitlistEntry>("/waitlist", input, token, signal);
}

export async function leaveWaitlist(id: string, token?: string, signal?: AbortSignal) {
  return apiDelete<{ ok: boolean }>(`/waitlist/${id}`, token, signal);
}

export async function getMyWaitlist(token?: string, signal?: AbortSignal) {
  return apiGet<WaitlistEntry[]>("/waitlist/mine", undefined, token, signal);
}