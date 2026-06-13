import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Receipt } from "lucide-react";
import { fetchPaymentBreakdown, type PaymentBreakdown as Breakdown } from "@/api";

const money = (cents: number) => `$${(Math.max(0, cents) / 100).toFixed(2)}`;

const Row: React.FC<{ label: string; value: string; sub?: boolean; strong?: boolean }> = ({ label, value, sub, strong }) => (
  <div className={`flex items-center justify-between ${sub ? "text-xs text-subtle" : "text-sm"} ${strong ? "font-bold text-app" : ""}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

export default function PaymentBreakdown({ bookingId, title = "Payment breakdown" }: { bookingId: string; title?: string }) {
  const { getToken } = useAuth();
  const [data, setData] = useState<Breakdown | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = await getToken();
        const res = await fetchPaymentBreakdown({ bookingId }, token, ac.signal);
        setData(res);
      } catch (e) {
        if ((e as any)?.name !== "AbortError") setError(true);
      }
    })();
    return () => ac.abort();
  }, [bookingId, getToken]);

  if (error) return null;
  if (!data) return <div className="ink-shimmer h-24 w-full rounded-xl" aria-hidden />;
  if (data.priceCents <= 0) return null;

  const settled = data.status === "completed";

  return (
    <div className="rounded-xl border border-app bg-elevated/60 p-3.5 text-app">
      <div className="flex items-center gap-1.5 text-sm font-bold mb-2.5">
        <Receipt className="h-4 w-4" /> {title}
        <span className="ml-auto text-[11px] font-medium text-subtle">{settled ? "Charged" : "Estimate"}</span>
      </div>

      <div className="space-y-1.5">
        <Row label="Tattoo / service" value={money(data.priceCents)} />
        <Row label={`Platform fee${data.baseFeeWaived ? " (base waived)" : ""}`} value={money(data.platformFeeCents)} />
        <div className="my-2 border-t border-app/60" />
        <Row label={settled ? "You paid" : "You'll pay"} value={money(data.clientTotalCents)} strong />
      </div>

      <div className="mt-3 pt-3 border-t border-app/60 space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-subtle mb-1">Where it goes</div>
        <Row label="Artist receives" value={money(data.artistNetCents)} sub />
        {data.isStudio && (
          <Row label={`Studio (${Math.round(data.commissionPct * 100)}% commission)`} value={money(data.studioCents)} sub />
        )}
        <Row label="Inkmity platform fee" value={money(data.platformFeeCents)} sub />
        <Row label="Card processing (Stripe)" value={money(data.stripeFeeCents)} sub />
      </div>
    </div>
  );
}
