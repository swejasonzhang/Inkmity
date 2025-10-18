import { apiGet, apiPost } from "@/lib/api";

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
  return apiGet<Booking[]>("/api/bookings", { artistId, date: dateISO });
}

export async function createBooking(input: {
  artistId: string;
  clientId: string;
  serviceId?: string;
  startISO: string;
  endISO: string;
  note?: string;
}) {
  return apiPost<Booking>("/api/bookings", input);
}

export async function cancelBooking(id: string) {
  return apiPost<Booking>(`/api/bookings/${id}/cancel`);
}

export async function completeBooking(id: string) {
  return apiPost<Booking>(`/api/bookings/${id}/complete`);
}