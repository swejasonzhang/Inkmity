import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/api/index.ts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogPortal } from "@/components/ui/dialog";

type Kind = "consultation" | "appointment";

type Props = {
  artistId: string;
  date?: Date;
};

type Slot = { startISO: string; endISO: string };

function toMinutes(hm: string) {
  const [hStr, mStr] = String(hm).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function atTimeLocal(day: Date, hm: string) {
  const mins = toMinutes(hm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutesLocal(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}

function buildDefaultFrames(day: Date, open = "10:00", close = "22:00", step = 30) {
  const start = atTimeLocal(day, open);
  const end = atTimeLocal(day, close);
  const out: Date[] = [];
  let t = new Date(start);
  while (t < end) {
    out.push(new Date(t));
    t = addMinutesLocal(t, step);
  }
  return out;
}

function timeKeyLocal(d: Date) {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function BookingPicker({ artistId, date }: Props) {
  const [kind, setKind] = useState<Kind>("consultation");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canConfirm = Boolean(selected && date);

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const dateLabel = useMemo(() => {
    if (!date) return "";
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }, [date]);

  useEffect(() => {
    if (!artistId || !date) return;
    const d = date.toISOString().slice(0, 10);
    apiGet(`/availability/${artistId}/slots?date=${d}`)
      .then((s) => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]));
  }, [artistId, date]);

  const availableByKey = useMemo(() => {
    const map = new Map<string, Slot>();
    for (const s of slots) {
      const k = timeKeyLocal(new Date(s.startISO));
      map.set(k, s);
    }
    return map;
  }, [slots]);

  const combinedTimes = useMemo(() => {
    if (!date) return [];
    return buildDefaultFrames(date, "10:00", "22:00", 30);
  }, [date]);

  async function handleAccept() {
    if (!selected) return;
    setSubmitting(true);
    const { startISO, endISO } = selected;
    try {
      const booking = await apiPost("/bookings", {
        artistId,
        startISO,
        endISO,
        serviceId: null,
        priceCents: 0
      });
      setSuccessMsg(
        `Booked ${new Date(startISO).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} • ` +
        `${new Date(startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ` +
        `${new Date(endISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      );
      window.dispatchEvent(new CustomEvent("ink:booking-created", { detail: booking }));
      setSelected(null);
      setConfirmOpen(false);
    } catch (e: any) {
      const msg = e?.body?.error || e?.body?.message || e?.message || "Failed to book";
      setSuccessMsg(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  const chipBase = "px-3 py-1 text-sm sm:text-base transition-colors focus:outline-none focus-visible:ring-2 rounded-md";
  const chipGroup = "inline-flex items-center gap-2 bg-transparent p-1 rounded-lg border";
  const chipBorderStyle = { borderColor: "var(--border)" };
  const chipInactive = { background: "color-mix(in oklab, var(--card) 92%, transparent)", color: "var(--fg)" };
  const chipActive = { background: "var(--fg)", color: "var(--card)" };

  return (
    <div className="w-full grid place-items-center">
      <div className="w-full max-w-3xl grid place-items-center text-center rounded-2xl p-4 sm:p-5 gap-4" style={{ background: "transparent", color: "var(--fg)" }}>
        <div className="grid gap-2 place-items-center">
          <h2 className="text-lg sm:text-xl font-semibold">Book a Time</h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!!dateLabel && (
              <span className="text-sm px-2 py-1 rounded-md border" style={{ borderColor: "var(--border)", color: "color-mix(in oklab, var(--fg) 85%, transparent)" }}>
                {dateLabel}
              </span>
            )}
            <span className="text-sm px-2 py-1 rounded-md border" style={{ borderColor: "var(--border)", color: "color-mix(in oklab, var(--fg) 85%, transparent)" }}>
              Times shown in <strong style={{ color: "var(--fg)" }}>{browserTz}</strong>
            </span>
          </div>
        </div>

        <div className="w-full grid place-items-center gap-1.5">
          <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
            Type
          </span>
          <div className={chipGroup} style={chipBorderStyle} role="group" aria-label="Booking type">
            <button type="button" aria-pressed={kind === "consultation"} onClick={() => setKind("consultation")} className={chipBase} style={kind === "consultation" ? chipActive : chipInactive}>
              Consultation
            </button>
            <button type="button" aria-pressed={kind === "appointment"} onClick={() => setKind("appointment")} className={chipBase} style={kind === "appointment" ? chipActive : chipInactive}>
              Appointment
            </button>
          </div>
        </div>

        <div className="w-full max-w-3xl grid gap-2 rounded-lg border p-3 sm:p-3.5 text-left" style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--card) 96%, transparent)" }} aria-live="polite">
          {kind === "consultation" ? (
            <>
              <div className="text-sm sm:text-base" style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}>
                You’re picking the <strong>start time</strong> of a consultation. Typical length: <strong>15–30 min</strong>
                <span style={{ opacity: 0.9 }}> (complex: <strong>30–60</strong>, large custom: <strong>60–90</strong>)</span>. Consultations are <strong>free</strong>. Your size, budget, and references are already on file.
              </div>
              <div className="text-xs sm:text-sm" style={{ color: "color-mix(in oklab, var(--fg) 78%, transparent)" }}>
                What can extend it: size/placement complexity, number of references, decision-making, video vs in-person, paperwork.
              </div>
            </>
          ) : (
            <>
              <div className="text-sm sm:text-base" style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}>
                You’re picking the <strong>start time</strong> of your appointment. Some artists require a <strong>non-refundable deposit</strong> (flat or %) to hold the spot and deter no-shows. Your style, budget, and refs are already shared with the artist.
              </div>
              <div className="text-xs sm:text-sm" style={{ color: "color-mix(in oklab, var(--fg) 78%, transparent)" }}>
                Cancellation policy: within <strong>72 hours</strong> of start date; <strong>deposits and booking fees may not be refunded.</strong>
              </div>
            </>
          )}
        </div>

        <div className="w-full">
          <div className="rounded-lg border w-full max-w-3xl p-2 sm:p-2.5 mx-auto" style={{ borderColor: "var(--border)", background: "transparent" }}>
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
              {combinedTimes.map((t) => {
                const key = timeKeyLocal(t);
                const avail = availableByKey.get(key);
                const isActive = selected?.startISO === avail?.startISO;
                const disabled = !avail;
                return (
                  <button
                    key={t.toISOString()}
                    onClick={() => {
                      if (avail) setSelected(avail);
                    }}
                    disabled={disabled}
                    className="px-2.5 py-[2.5px] rounded-lg transition outline-none focus-visible:ring-2 min-w-[88px] text-sm sm:text-base text-center"
                    style={{
                      background: isActive ? "var(--fg)" : "color-mix(in oklab, var(--card) 95%, transparent)",
                      color: isActive ? "var(--card)" : "var(--fg)",
                      border: `1px solid ${isActive ? "var(--fg)" : "var(--border)"}`,
                      opacity: disabled ? 0.45 : 1,
                      cursor: disabled ? "not-allowed" : "pointer"
                    }}
                    aria-disabled={disabled}
                  >
                    {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                );
              })}
              {combinedTimes.length === 0 && (
                <div className="w-full text-center text-sm sm:text-base py-2" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                  No times for this day.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-sm sm:text-base" style={{ color: "color-mix(in oklab, var(--fg) 78%, transparent)" }}>
          {selected ? (
            <>
              Selected:{" "}
              <span className="font-medium" style={{ color: "var(--fg)" }}>
                {new Date(selected.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>{" "}
              • <span className="font-medium capitalize">{kind}</span>
            </>
          ) : (
            "Select a time above."
          )}
        </div>

        {successMsg && (
          <div className="rounded-md px-3 py-2 text-sm sm:text-base" style={{ background: "var(--elevated)", color: "var(--fg)" }}>
            {successMsg}
          </div>
        )}

        <Button
          disabled={!canConfirm}
          onClick={() => setConfirmOpen(true)}
          className="px-4 py-2 rounded-xl font-medium transition outline-none focus-visible:ring-2 min-w-[160px] text-sm sm:text-base"
          style={{
            background: canConfirm ? "var(--fg)" : "color-mix(in oklab, var(--elevated) 80%, transparent)",
            color: canConfirm ? "var(--card)" : "color-mix(in oklab, var(--fg) 60%, transparent)",
            border: `1px solid ${canConfirm ? "var(--fg)" : "var(--border)"}`
          }}
        >
          Confirm
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen} modal={false}>
        <DialogPortal container={typeof document !== "undefined" ? document.body : undefined}>
          <DialogContent className="z-[100]">
            <DialogHeader>
              <DialogTitle>Confirm your {kind}</DialogTitle>
            </DialogHeader>
            <div className="mt-1 text-sm">
              {selected ? (
                <div>
                  {new Date(selected.startISO).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })} ·{" "}
                  {new Date(selected.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {new Date(selected.endISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              ) : null}
            </div>
            <DialogFooter className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                Deny
              </Button>
              <Button onClick={handleAccept} disabled={submitting}>
                {submitting ? "Booking..." : "Accept"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
