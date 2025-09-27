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
  userId: string;
  start: string; 
  end: string;  
  note?: string;
  status: "booked" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5005";

export async function getAvailability(artistId: string): Promise<Availability> {
  const res = await fetch(`${API_BASE}/api/availability/${artistId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch availability");
  const data = (await res.json()) as Availability;
  if (!data.exceptions || typeof data.exceptions !== "object") data.exceptions = {};
  return data;
}

export async function saveAvailability(artistId: string, payload: Availability): Promise<Availability> {
  const res = await fetch(`${API_BASE}/api/availability/${artistId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save availability");
  return (await res.json()) as Availability;
}

export async function getBookingsForDate(artistId: string, dateISO: string): Promise<Booking[]> {
  const url = new URL(`${API_BASE}/api/bookings`);
  url.searchParams.set("artistId", artistId);
  url.searchParams.set("date", dateISO);
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return (await res.json()) as Booking[];
}

export async function createBooking(params: {
  artistId: string;
  startISO: string;
  endISO: string;
  note?: string;
}): Promise<Booking> {
  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  if (res.status === 409) throw new Error("Slot already booked");
  if (!res.ok) throw new Error("Failed to create booking");
  return (await res.json()) as Booking;
}