import { http } from "@/lib/http";

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

export async function fetchArtists(filters: Record<string, any>) {
  return http<{
    items: Artist[];
    total: number;
    page: number;
    pageSize: number;
  }>("/users/artists", { method: "GET" }, undefined, filters);
}

export async function fetchArtistById(id: string) {
  return http<Artist>(`/users/artists/${id}`, { method: "GET" });
}

export interface DashboardArtist {
  id: string;
  name: string;
  location: string;
  style: string;
  priceRange: string;
  rating: number;
}

export async function getDashboardData(token: string) {
  return http<{ featuredArtists: DashboardArtist[] }>(
    "/dashboard",
    { method: "GET" },
    token
  );
}

export type ReviewInput = {
  artistClerkId: string;
  rating: number;
  text?: string;
};

export async function addReview(token: string, reviewData: ReviewInput) {
  return http(
    "/reviews",
    { method: "POST", body: JSON.stringify(reviewData) },
    token
  );
}

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

export async function fetchConversations(token: string, userId: string) {
  return http<ConversationDTO[]>(
    `/messages/user/${userId}`,
    { method: "GET" },
    token
  );
}

export async function sendMessage(token: string, data: MessageDTO) {
  return http(
    "/messages",
    { method: "POST", body: JSON.stringify(data) },
    token
  );
}

export async function deleteConversation(
  token: string,
  userId: string,
  participantId: string
) {
  return http(
    "/messages/conversations",
    { method: "DELETE", body: JSON.stringify({ userId, participantId }) },
    token
  );
}

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

export async function listBookingsForDay(artistId: string, dateISO: string) {
  return http<Booking[]>("/bookings", { method: "GET" }, undefined, {
    artistId,
    date: dateISO,
  });
}

export async function createBooking(input: {
  artistId: string;
  clientId: string;
  serviceId?: string;
  startISO: string;
  endISO: string;
  note?: string;
}) {
  return http<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify({
      artistId: input.artistId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      startAt: input.startISO,
      endAt: input.endISO,
      note: input.note,
    }),
  });
}

export async function cancelBooking(id: string) {
  return http<Booking>(`/bookings/${id}/cancel`, { method: "POST" });
}

export async function completeBooking(id: string) {
  return http<Booking>(`/bookings/${id}/complete`, { method: "POST" });
}

export async function getBooking(id: string) {
  return http<Booking>(`/bookings/${id}`, { method: "GET" });
}

export async function startCheckout(bookingId: string, label?: string) {
  return http<{
    ok?: boolean;
    mode?: "free";
    url?: string;
    billingId?: string;
  }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ bookingId, label }),
  });
}

export async function refundByBooking(bookingId: string) {
  return http<{ ok: boolean }>("/billing/refund", {
    method: "POST",
    body: JSON.stringify({ bookingId }),
  });
}

export type Me = {
  _id: string;
  clerkId: string;
  role: "client" | "artist";
  username: string;
};

export async function getMe(token: string) {
  return http<Me>("/users/me", { method: "GET" }, token);
}

export async function syncUser(
  token: string,
  payload: {
    clerkId: string;
    email: string;
    role: "client" | "artist";
    username: string;
    firstName?: string;
    lastName?: string;
    profile: Record<string, any>;
  }
) {
  return http(
    "/users/sync",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}