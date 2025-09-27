const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function getAvailability(artistId) {
  const res = await fetch(`${API_BASE}/api/availability/${artistId}`);
  if (!res.ok) throw new Error("Failed to fetch availability");
  return res.json();
}

export async function saveAvailability(artistId, payload) {
  const res = await fetch(`${API_BASE}/api/availability/${artistId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save availability");
  return res.json();
}

export async function getBookingsForDate(artistId, dateISO) {
  const url = new URL(`${API_BASE}/api/bookings`);
  url.searchParams.set("artistId", artistId);
  url.searchParams.set("date", dateISO);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return res.json();
}

export async function createBooking({
  artistId,
  userId,
  startISO,
  endISO,
  note,
}) {
  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId, userId, startISO, endISO, note }),
  });
  if (res.status === 409) throw new Error("Slot already booked");
  if (!res.ok) throw new Error("Failed to create booking");
  return res.json();
}
