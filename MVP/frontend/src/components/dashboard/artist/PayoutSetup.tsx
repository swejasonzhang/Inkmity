import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Wallet, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getConnectStatus,
  startConnectOnboarding,
  getConnectLoginLink,
  type ConnectStatus,
} from "@/api";

export default function PayoutSetup() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const s = await getConnectStatus(token ?? undefined);
      setStatus(s);
    } catch (e: any) {
      setError(e?.message || "Failed to load payout status");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const onSetup = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const { url } = await startConnectOnboarding(token ?? undefined);
      if (url) window.location.href = url;
    } catch (e: any) {
      setError(e?.message || "Could not start onboarding");
      setBusy(false);
    }
  }, [getToken]);

  const onManage = useCallback(async () => {
    setBusy(true);
    try {
      const token = await getToken();
      const { url } = await getConnectLoginLink(token ?? undefined);
      if (url) window.open(url, "_blank", "noopener");
    } catch (e: any) {
      setError(e?.message || "Could not open payouts dashboard");
    } finally {
      setBusy(false);
    }
  }, [getToken]);

  if (loading) return null;

  const ready = Boolean(status?.connected && status?.chargesEnabled);

  if (ready) {
    return (
      <div className="rounded-xl border border-app bg-elevated px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="h-4 w-4 text-app shrink-0" />
          <span className="text-[11px] sm:text-xs text-app truncate">
            Payouts active — you can accept bookings.
            {!status?.payoutsEnabled && " (payout details pending)"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onManage} disabled={busy} className="shrink-0">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
          <span className="ml-1 text-[11px]">Payouts</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app bg-card px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-start gap-2 min-w-0">
        <Wallet className="h-4 w-4 text-app mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-app">Finish payment setup to accept bookings</p>
          <p className="text-[11px] sm:text-xs text-muted">
            Connect your bank with Stripe so clients can pay deposits and you get paid out.
          </p>
          {error && (
            <p className="text-[11px] text-white/80 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" /> {error}
            </p>
          )}
        </div>
      </div>
      <Button size="sm" onClick={onSetup} disabled={busy} className="shrink-0">
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
        {status?.connected ? "Continue setup" : "Set up payouts"}
      </Button>
    </div>
  );
}
