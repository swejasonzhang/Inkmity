import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Wallet, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getConnectStatus,
  startConnectOnboarding,
  getConnectLoginLink,
  type ConnectStatus,
} from "@/api";
import DocumentSignModal from "@/components/dashboard/shared/DocumentSignModal";

let cachedConnectStatus: ConnectStatus | null = null;

function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-app underline underline-offset-2 break-all hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

type Props = {
  redirectToProfile?: boolean;
};

export default function PayoutSetup({ redirectToProfile = false }: Props) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectStatus | null>(cachedConnectStatus);
  const [loading, setLoading] = useState(cachedConnectStatus === null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementOpen, setAgreementOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const s = await getConnectStatus(token ?? undefined);
      cachedConnectStatus = s;
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
      if (e?.status === 403 && e?.body?.error === "agreement_required") {
        setAgreementOpen(true);
        setBusy(false);
        return;
      }
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

  if (loading) {
    return (
      <div className="rounded-xl border border-app bg-card px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Skeleton className="h-4 w-4 rounded-full mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4 max-w-[16rem]" />
            <Skeleton className="h-3 w-full max-w-[22rem]" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-md shrink-0" />
      </div>
    );
  }

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

  if (redirectToProfile) {
    return (
      <div className="rounded-xl border border-app bg-card px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-start gap-2 min-w-0">
          <Wallet className="h-4 w-4 text-app mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-app">Finish payment setup to accept bookings</p>
            <p className="text-[11px] sm:text-xs text-muted">
              Connect your bank with Stripe so clients can pay deposits and you get paid out.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/profile")} className="shrink-0">
          {status?.connected ? "Continue setup" : "Set up payouts"}
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app bg-card px-3 sm:px-4 py-3 flex flex-col items-center text-center gap-1.5 flex-shrink-0">
      <DocumentSignModal
        open={agreementOpen}
        docType="artist_agreement"
        signerRole="artist"
        onSigned={() => {
          setAgreementOpen(false);
          onSetup();
        }}
        onClose={() => setAgreementOpen(false)}
      />
      <Wallet className="h-4 w-4 text-app shrink-0" />
      <p className="text-xs sm:text-sm font-semibold text-app break-words">
        Finish payment setup to accept bookings.
      </p>
      <p className="text-[11px] sm:text-xs text-muted break-words">
        <button
          type="button"
          onClick={onSetup}
          disabled={busy}
          className="font-semibold text-app underline underline-offset-2 hover:opacity-80 disabled:opacity-60"
        >
          {status?.connected ? "Continue connecting your Stripe account" : "Connect your bank with Stripe"}
        </button>{" "}
        so clients can pay deposits and you get paid out.
      </p>
      {busy && (
        <p className="text-[11px] text-muted flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" /> Opening Stripe…
        </p>
      )}
      {error && (
        <div className="w-full flex items-start gap-1 text-[11px] text-app/80 text-left">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">{linkify(error)}</span>
        </div>
      )}
    </div>
  );
}
