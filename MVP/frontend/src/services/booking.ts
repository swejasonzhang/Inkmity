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
  return apiGet<Booking[]>("/bookings", { artistId, date: dateISO });
}

export async function createBooking(input: {
  artistId: string;
  clientId: string;
  serviceId?: string;
  startISO: string;
  endISO: string;
  note?: string;
}) {
  const payload = {
    artistId: input.artistId,
    clientId: input.clientId,
    serviceId: input.serviceId,
    startAt: input.startISO,
    endAt: input.endISO,
    note: input.note,
  };
  return apiPost<Booking>("/bookings", payload);
}

export async function cancelBooking(id: string) {
  return apiPost<Booking>(`/bookings/${id}/cancel`);
}

export async function completeBooking(id: string) {
  return apiPost<Booking>(`/bookings/${id}/complete`);
}