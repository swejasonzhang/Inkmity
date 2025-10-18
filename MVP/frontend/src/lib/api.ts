export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface TimeRange {
  start: string;
  end: string;
}

export interface Availability {
  artistId: string;
  timezone: string;
  slotMinutes: number;
  weekly: Record<Weekday, TimeRange[]>;
  exceptions: Record<string, TimeRange[]>;
}

export interface Booking {
  _id: string;
  artistId: string;
  clientId: string;
  serviceId?: string;
  start: string;
  end: string;
  note?: string;
  status: "booked" | "cancelled" | "completed" | "pending";
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5005";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiGet<T>(path: string, qs?: Record<string, string>) {
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

async function apiPost<T>(path: string, body?: any) {
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

async function apiPut<T>(path: string, body?: any) {
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

type BookingFromBackend = Omit<Booking, "start" | "end"> & {
  startAt: string;
  endAt: string;
};

function mapFromBackend(b: BookingFromBackend): Booking {
  const { startAt, endAt, ...rest } = b as any;
  return { ...rest, start: startAt, end: endAt };
}

function mapArrayFromBackend(list: BookingFromBackend[]): Booking[] {
  return list.map(mapFromBackend);
}

export async function getAvailability(artistId: string): Promise<Availability> {
  const data = await apiGet<Availability>(`/api/availability/${artistId}`);
  if (!data.exceptions || typeof data.exceptions !== "object")
    (data as any).exceptions = {};
  return data;
}

export async function saveAvailability(
  artistId: string,
  payload: Availability
): Promise<Availability> {
  return apiPut<Availability>(`/api/availability/${artistId}`, payload);
}

export async function getBookingsForDate(
  artistId: string,
  dateISO: string
): Promise<Booking[]> {
  const data = await apiGet<BookingFromBackend[]>("/api/bookings", {
    artistId,
    date: dateISO,
  });
  return mapArrayFromBackend(data);
}

export async function createBooking(params: {
  artistId: string;
  clientId: string;
  serviceId?: string;
  startISO: string;
  endISO: string;
  note?: string;
}): Promise<Booking> {
  const created = await apiPost<BookingFromBackend>("/api/bookings", params);
  return mapFromBackend(created);
}

export async function cancelBooking(id: string): Promise<Booking> {
  const updated = await apiPost<BookingFromBackend>(
    `/api/bookings/${id}/cancel`
  );
  return mapFromBackend(updated);
}

export async function completeBooking(id: string): Promise<Booking> {
  const updated = await apiPost<BookingFromBackend>(
    `/api/bookings/${id}/complete`
  );
  return mapFromBackend(updated);
}

export async function getBooking(id: string): Promise<Booking> {
  const b = await apiGet<BookingFromBackend>(`/api/bookings/${id}`);
  return mapFromBackend(b);
}

export async function startCheckout(
  bookingId: string,
  label?: string
): Promise<{
  ok?: boolean;
  mode?: "free";
  url?: string;
  billingId?: string;
}> {
  return apiPost("/api/billing/checkout", { bookingId, label });
}

export async function refundByBooking(bookingId: string) {
  return apiPost("/api/billing/refund", { bookingId });
}