import { useAuth } from "@clerk/clerk-react";

export const API_URL: string = (
  (import.meta as any)?.env?.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/+$/, "");

function buildUrl(path: string, params?: Record<string, any>) {
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
  token?: string | null
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

async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string | null
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
  token?: string | null,
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
  token?: string | null,
  signal?: AbortSignal
) {
  return apiRequest<T>(
    path,
    { method: "POST", body: body ? JSON.stringify(body) : undefined, signal },
    token
  );
}

async function apiPatch<T = any>(
  path: string,
  body?: any,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiRequest<T>(
    path,
    { method: "PATCH", body: body ? JSON.stringify(body) : undefined, signal },
    token
  );
}

async function apiDelete<T = any>(
  path: string,
  token?: string | null,
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
  recommend?: boolean;
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

export async function addReview(
  token: string | null | undefined,
  reviewData: ReviewInput,
  signal?: AbortSignal
) {
  return apiPost("/reviews", reviewData, token, signal);
}

export async function getBooking(
  id: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiGet<Booking>(`/bookings/${id}`, undefined, token, signal);
}

export async function checkoutDeposit(
  bookingId: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<{
    url?: string;
    id?: string;
    clientSecret?: string;
  }>("/billing/deposit", { bookingId }, token, signal);
}

export async function getMe(opts?: { token?: string | null; signal?: AbortSignal }) {
  return apiGet<Me>("/users/me", undefined, opts?.token, opts?.signal);
}

export async function updateVisibility(
  visibility: "online" | "away" | "invisible",
  token?: string | null,
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
  token?: string | null,
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

export async function getAppointments(
  role?: "client" | "artist",
  token?: string | null,
  signal?: AbortSignal
) {
  const params = role ? { role } : {};
  return apiGet<Booking[]>("/bookings/appointments", params, token, signal);
}

export type UnreadState = {
  unreadConversationIds?: string[];
  pendingRequestIds?: string[];
  counts?: { unreadConversations?: number; pendingRequests?: number };
};

export async function getUnreadState(token?: string | null, signal?: AbortSignal) {
  return apiGet<UnreadState>("/messages/unread", undefined, token, signal);
}

export type NotificationItem = {
  id: string;
  kind: string | null;
  name: string;
  text: string;
  createdAt: string;
};

export async function getNotifications(token?: string | null, signal?: AbortSignal) {
  return apiGet<{ items: NotificationItem[] }>("/messages/notifications", undefined, token, signal);
}

export async function acceptAppointment(
  id: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/accept`, undefined, token, signal);
}

export async function denyAppointment(
  id: string,
  reason?: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/deny`, reason ? { reason } : undefined, token, signal);
}

// Completion phase 1: issue a fresh 3-minute code to each party.
export async function startBookingVerification(
  id: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/verify/start`, undefined, token, signal);
}

// Completion phase 2: each party confirms with their own code; both → charged + split.
export async function verifyBookingCompletion(
  id: string,
  role: "client" | "artist",
  code: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<Booking>(`/bookings/${id}/verify`, { role, code }, token, signal);
}

export async function setBookingFinalPrice(
  id: string,
  finalPriceCents: number,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPatch<Booking>(`/bookings/${id}/final-price`, { finalPriceCents }, token, signal);
}

export async function getIntakeForm(
  bookingId: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiGet<IntakeForm | null>(`/bookings/${bookingId}/intake`, undefined, token, signal);
}

export async function submitIntakeForm(
  bookingId: string,
  form: Partial<IntakeForm>,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<IntakeForm>(`/bookings/${bookingId}/intake`, form, token, signal);
}

// Save the client's card on file at booking (no charge) for the at-completion capture.
export async function createCardSetupIntent(
  bookingId: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<{
    clientSecret: string;
    setupIntentId: string;
    customerId: string;
  }>("/billing/setup-intent", { bookingId }, token, signal);
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
  token?: string | null,
  signal?: AbortSignal
) {
  return apiRequest<ArtistPolicy>(
    `/artist-policy/${artistId}`,
    { method: "PUT", body: JSON.stringify({ deposit, bookingEnabled }), signal },
    token
  );
}

export type PieceSize = "flash" | "small" | "medium" | "large" | "sleeve" | "back_piece";

export type BookingGate = {
  enabled: boolean;
  depositConfigured: boolean;
  payoutsReady?: boolean;
  maxSessions?: number;
  pieceSize?: PieceSize;
  message: string;
};

export async function getBookingGate(artistId: string, clientId?: string, signal?: AbortSignal) {
  const params = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  return apiGet<BookingGate>(`/artist-policy/${artistId}/booking-gate${params}`, undefined, undefined, signal);
}

export async function enableClientBookings(
  artistId: string,
  clientId: string,
  opts?: { pieceSize?: PieceSize; maxSessions?: number },
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<{ ok: boolean; permission?: any; message?: string }>(
    "/artist-policy/enable-client-bookings",
    { artistId, clientId, ...(opts || {}) },
    token,
    signal
  );
}

export type ConsultationStatus = {
  hasCompletedConsultation: boolean;
  consultationDate: string | null;
};

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

export async function signDocument(
  docType: string,
  input: {
    signatureName: string;
    signerRole: "client" | "artist" | "studio";
    bookingId?: string;
    studioId?: string;
  },
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost(`/documents/${docType}/sign`, input, token, signal);
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

export async function getArtistAnalytics(token?: string | null, signal?: AbortSignal) {
  return apiGet<ArtistAnalytics>("/dashboard/artist-analytics", undefined, token, signal);
}

export type ConnectStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
};

export async function getConnectStatus(token?: string | null, signal?: AbortSignal) {
  return apiGet<ConnectStatus>("/connect/status", undefined, token, signal);
}

export async function startConnectOnboarding(token?: string | null, signal?: AbortSignal) {
  return apiPost<{ url: string }>("/connect/account-link", undefined, token, signal);
}

export async function getConnectLoginLink(token?: string | null, signal?: AbortSignal) {
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
  lat?: number;
  lng?: number;
  placeId?: string;
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
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<Studio>("/studios", input, token, signal);
}

export async function getMyStudios(token?: string | null, signal?: AbortSignal) {
  return apiGet<Studio[]>("/studios/mine", undefined, token, signal);
}

export async function updateStudio(
  studioId: string,
  patch: Partial<Studio>,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPatch<Studio>(`/studios/${studioId}`, patch, token, signal);
}

export async function listStudioMembers(
  studioId: string,
  token?: string | null,
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
  token?: string | null,
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
  token?: string | null,
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
  token?: string | null,
  signal?: AbortSignal
) {
  return apiDelete<{ ok: boolean }>(
    `/studios/${studioId}/members/${artistClerkId}`,
    token,
    signal
  );
}

export async function getMyStudioMemberships(
  token?: string | null,
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
  token?: string | null,
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
  token?: string | null,
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
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<{ url: string }>(
    `/studios/${studioId}/connect/account-link`,
    undefined,
    token,
    signal
  );
}

export type PlatformFee = { baseCents: number; pct: number; capCents: number };

export type RewardsSummary = {
  completedBookings: number;
  tier: { key: string; label: string };
  nextTier: {
    key: string;
    label: string;
    bookingsToNextTier: number;
  } | null;
  platformFee: PlatformFee;
  baseFeeWaived?: boolean;
  totalFeesPaidCents: number;
  lifetimeDiscountUsd: number;
};

// Single source of truth for how the platform fee reads in the UI.
export function formatPlatformFee(f?: PlatformFee | null) {
  const noBase = (f?.baseCents ?? 0) <= 0;
  const base = `$${Math.round((f?.baseCents ?? 0) / 100)}`;
  const pctNum = (f?.pct ?? 0) * 100;
  const pct = `${Number.isInteger(pctNum) ? pctNum : pctNum.toFixed(1)}%`;
  const cap = `$${Math.round((f?.capCents ?? 0) / 100)}`;
  const short = noBase ? pct : `${base} + ${pct}`;
  return { base, pct, cap, short, full: `${short}, max ${cap}` };
}

export async function getMyRewards(token?: string | null, signal?: AbortSignal) {
  return apiGet<RewardsSummary>("/rewards/me", undefined, token, signal);
}

export async function getMyCredits(token?: string | null, signal?: AbortSignal) {
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
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<WaitlistEntry>("/waitlist", input, token, signal);
}

export async function leaveWaitlist(id: string, token?: string | null, signal?: AbortSignal) {
  return apiDelete<{ ok: boolean }>(`/waitlist/${id}`, token, signal);
}

export async function getMyWaitlist(token?: string | null, signal?: AbortSignal) {
  return apiGet<WaitlistEntry[]>("/waitlist/mine", undefined, token, signal);
}

export type ArtistWaitlistEntry = WaitlistEntry & {
  tierLabel?: string;
  priorityRank?: number;
  client?: { username?: string; avatar?: { url?: string } | null } | null;
};

export async function getArtistWaitlist(token?: string | null, signal?: AbortSignal) {
  return apiGet<ArtistWaitlistEntry[]>("/waitlist/artist", undefined, token, signal);
}

export type Sketch = {
  _id: string;
  bookingId: string;
  artistId: string;
  clientId: string;
  imageUrls: string[];
  note?: string;
  status: "pending" | "approved" | "changes_requested";
  clientNote?: string;
  respondedAt?: string;
  createdAt?: string;
};

export async function getSketches(bookingId: string, token?: string | null, signal?: AbortSignal) {
  return apiGet<Sketch[]>("/sketches", { bookingId }, token, signal);
}

export async function createSketch(
  input: { bookingId: string; imageUrls: string[]; note?: string },
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<Sketch>("/sketches", input, token, signal);
}

export async function respondToSketch(
  id: string,
  action: "approve" | "request_changes",
  note?: string,
  token?: string | null,
  signal?: AbortSignal
) {
  return apiPost<Sketch>(`/sketches/${id}/respond`, { action, note }, token, signal);
}