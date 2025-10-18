import { apiPost } from "@/lib/api";

export async function startCheckout(bookingId: string, label?: string) {
  return apiPost<{
    ok?: boolean;
    mode?: "free";
    url?: string;
    billingId?: string;
  }>("/api/billing/checkout", { bookingId, label });
}

export async function refundByBooking(bookingId: string) {
  return apiPost("/api/billing/refund", { bookingId });
}