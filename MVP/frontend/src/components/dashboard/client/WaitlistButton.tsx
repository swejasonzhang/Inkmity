import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  joinWaitlist,
  leaveWaitlist,
  getMyWaitlist,
  type WaitlistEntry,
} from "@/api";

export default function WaitlistButton({ artistId }: { artistId: string }) {
  const { getToken } = useAuth();
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = (await getToken()) ?? undefined;
        const list = await getMyWaitlist(token, ac.signal);
        setEntry(
          list.find(
            (e) =>
              e.artistId === artistId &&
              (e.status === "active" || e.status === "notified")
          ) || null
        );
      } catch {
        /* optional */
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [artistId, getToken]);

  const toggle = async () => {
    setBusy(true);
    try {
      const token = (await getToken()) ?? undefined;
      if (entry) {
        await leaveWaitlist(entry._id, token);
        setEntry(null);
        toast.success("Left the waitlist", { theme: "dark" });
      } else {
        const e = await joinWaitlist({ artistId }, token);
        setEntry(e);
        toast.success("You're on the waitlist — we'll alert you when a spot opens", {
          theme: "dark",
        });
      }
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong", { theme: "dark" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <Button
      variant={entry ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={busy}
      className="rounded-xl"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
      ) : entry ? (
        <BellOff className="h-3.5 w-3.5 mr-1" />
      ) : (
        <Bell className="h-3.5 w-3.5 mr-1" />
      )}
      {entry ? "Leave waitlist" : "Join waitlist"}
    </Button>
  );
}
