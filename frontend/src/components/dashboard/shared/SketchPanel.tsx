import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { PenTool, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSketches,
  createSketch,
  respondToSketch,
  type Sketch,
} from "@/api";

const statusLabel: Record<string, string> = {
  pending: "Awaiting your approval",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export default function SketchPanel({
  bookingId,
  isArtist,
  isClient,
}: {
  bookingId: string;
  isArtist: boolean;
  isClient: boolean;
}) {
  const { getToken } = useAuth();
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const t = (await getToken()) ?? undefined;
      setSketches(await getSketches(bookingId, t));
    } catch {
    } finally {
      setLoaded(true);
    }
  }, [bookingId, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const share = async () => {
    const urls = url.split(",").map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setBusy(true);
    try {
      const t = (await getToken()) ?? undefined;
      await createSketch({ bookingId, imageUrls: urls, note }, t);
      setUrl("");
      setNote("");
      toast.success("Sketch shared", { theme: "dark" });
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to share sketch", { theme: "dark" });
    } finally {
      setBusy(false);
    }
  };

  const respond = async (id: string, action: "approve" | "request_changes") => {
    let changeNote = "";
    if (action === "request_changes") {
      changeNote = window.prompt("What changes would you like?") || "";
    }
    setBusy(true);
    try {
      const t = (await getToken()) ?? undefined;
      await respondToSketch(id, action, changeNote, t);
      toast.success(action === "approve" ? "Sketch approved" : "Changes requested", {
        theme: "dark",
      });
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed", { theme: "dark" });
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;
  if (sketches.length === 0 && !isArtist) return null;

  return (
    <div className="pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <PenTool className="h-3.5 w-3.5 text-muted" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sketches</span>
      </div>

      <div className="flex flex-col gap-2">
        {sketches.map((s) => (
          <div key={s._id} className="rounded-lg border border-app bg-elevated p-2">
            <div className="flex gap-1.5 overflow-x-auto">
              {s.imageUrls.map((src, i) => (
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt={`Sketch ${i + 1}`}
                  className="h-20 w-20 shrink-0 rounded-md object-cover border border-app"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            {s.note && <p className="mt-1.5 text-xs text-app/80">{s.note}</p>}
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span
                className={`text-[11px] ${s.status === "approved" ? "text-app" : "text-muted"}`}
              >
                {s.status === "approved" && <Check className="inline h-3 w-3 mr-0.5" />}
                {statusLabel[s.status] || s.status}
              </span>
              {isClient && s.status === "pending" && (
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => respond(s._id, "request_changes")} className="h-7 rounded-lg text-[11px]">
                    Request changes
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => respond(s._id, "approve")} className="h-7 rounded-lg text-[11px]">
                    Approve
                  </Button>
                </div>
              )}
            </div>
            {s.clientNote && s.status === "changes_requested" && (
              <p className="mt-1 text-[11px] text-muted">Client note: {s.clientNote}</p>
            )}
          </div>
        ))}

        {isArtist && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-app/60 p-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Sketch image URL(s), comma-separated"
              className="h-8"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="h-8"
            />
            <Button size="sm" disabled={busy || !url.trim()} onClick={share} className="h-8 rounded-lg text-xs self-end">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Share sketch
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
