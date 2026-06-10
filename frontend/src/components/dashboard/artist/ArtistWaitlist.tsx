import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Users } from "lucide-react";
import { getArtistWaitlist, type ArtistWaitlistEntry } from "@/api";

export default function ArtistWaitlist() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<ArtistWaitlistEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const t = (await getToken()) ?? undefined;
        setEntries(await getArtistWaitlist(t, ac.signal));
      } catch {
      } finally {
        setLoaded(true);
      }
    })();
    return () => ac.abort();
  }, [getToken]);

  if (!loaded || entries.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto w-full mt-6 rounded-2xl border border-app bg-elevated overflow-hidden">
      <div className="px-4 py-2.5 border-b border-app flex items-center gap-1.5">
        <Users className="h-4 w-4 text-muted" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Waitlist ({entries.length}) · highest tier first
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {entries.map((e, i) => (
          <div key={e._id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted w-5 shrink-0">{i + 1}.</span>
              <span className="text-sm text-app truncate">
                {e.client?.username || "Client"}
              </span>
              {e.tierLabel && (
                <span className="rounded-full border border-app px-1.5 py-0.5 text-[10px] font-semibold text-app shrink-0">
                  {e.tierLabel}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted shrink-0">
              {e.status === "notified" ? "Notified" : "Waiting"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
