import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { apiGet, apiPost } from "@/api/index.ts"
import { Button } from "@/components/ui/button"
import {
  Dialog as RDialog,
  DialogContent as RDialogContent,
  DialogFooter as RDialogFooter,
  DialogHeader as RDialogHeader,
  DialogTitle as RDialogTitle,
  DialogPortal as RDialogPortal,
  DialogDescription as RDialogDescription,
  DialogOverlay as RDialogOverlay
} from "@/components/ui/dialog"
import { toast } from "react-toastify"
import { useTheme } from "@/hooks/useTheme"

type Kind = "consultation" | "appointment"
type Props = { artistId: string; date?: Date }
type Slot = { startISO: string; endISO: string }

function toMinutes(hm: string) {
  const [hStr, mStr] = String(hm).split(":")
  const h = Number(hStr)
  const m = Number(mStr)
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m)
}
function atTimeLocal(day: Date, hm: string) {
  const mins = toMinutes(hm)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}
function addMinutesLocal(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000)
}
function buildDefaultFrames(day: Date, open = "10:00", close = "22:00", step = 30) {
  const start = atTimeLocal(day, open)
  const end = atTimeLocal(day, close)
  const out: Date[] = []
  let t = new Date(start)
  while (t < end) {
    out.push(new Date(t))
    t = addMinutesLocal(t, step)
  }
  return out
}
function timeKeyLocal(d: Date) {
  const hh = d.getHours().toString().padStart(2, "0")
  const mm = d.getMinutes().toString().padStart(2, "0")
  return `${hh}:${mm}`
}
function swallowGestureTail(ms = 220) {
  const h = (ev: Event) => {
    ev.stopPropagation()
      ; (ev as any).stopImmediatePropagation?.()
  }
  document.addEventListener("pointerup", h, true)
  document.addEventListener("mouseup", h, true)
  document.addEventListener("click", h, true)
  window.setTimeout(() => {
    document.removeEventListener("pointerup", h, true)
    document.removeEventListener("mouseup", h, true)
    document.removeEventListener("click", h, true)
  }, ms)
}

export default function BookingPicker({ artistId, date }: Props) {
  const scopeRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme(scopeRef.current)
  const isLightTheme = theme === "light"

  const [kind, setKind] = useState<Kind>("consultation")
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canConfirm = Boolean(selected && date)

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
      return "UTC"
    }
  }, [])

  const dateLabel = useMemo(() => {
    if (!date) return ""
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })
  }, [date])

  const refreshSlots = useCallback(async () => {
    if (!artistId || !date) return
    const d = date.toISOString().slice(0, 10)
    try {
      const s = await apiGet(`/availability/${artistId}/slots?date=${d}`)
      setSlots(Array.isArray(s) ? s : [])
    } catch {
      setSlots([])
    }
  }, [artistId, date])

  useEffect(() => {
    refreshSlots()
  }, [refreshSlots])

  useEffect(() => {
    const onBooked = () => refreshSlots()
    window.addEventListener("ink:booking-created", onBooked as EventListener)
    return () => window.removeEventListener("ink:booking-created", onBooked as EventListener)
  }, [refreshSlots])

  const availableStartsByKey = useMemo(() => {
    const map = new Map<string, Slot>()
    for (const s of slots) {
      const sStart = new Date(s.startISO)
      const sEnd = new Date(s.endISO)
      let t = new Date(sStart)
      while (addMinutesLocal(t, 30) <= sEnd) {
        const k = timeKeyLocal(t)
        map.set(k, { startISO: t.toISOString(), endISO: addMinutesLocal(t, 30).toISOString() })
        t = addMinutesLocal(t, 30)
      }
    }
    return map
  }, [slots])

  const combinedTimes = useMemo(() => {
    if (!date) return []
    return buildDefaultFrames(date, "10:00", "22:00", 30)
  }, [date])

  async function handleAccept() {
    if (!selected) return
    setSubmitting(true)
    const { startISO, endISO } = selected
    try {
      const booking = await apiPost("/bookings", {
        artistId,
        startISO,
        endISO,
        serviceId: null,
        priceCents: 0
      })
      window.dispatchEvent(new CustomEvent("ink:booking-created", { detail: booking }))
      swallowGestureTail()
      setSelected(null)
      setConfirmOpen(false)
      toast.success(
        `${new Date(startISO).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} • ${new Date(startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(endISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      )
      await refreshSlots()
    } catch (err: any) {
      const msg = err?.body?.error || err?.body?.message || err?.message || "Failed to book"
      toast.error(String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const chipBase = "px-3 py-1 text-sm sm:text-base rounded-md focus:outline-none focus-visible:ring-2"
  const chipInactiveCls = isLightTheme
    ? "bg-transparent text-black border border-black/30"
    : "bg-transparent text-app border border-white/40"
  const chipActiveCls = "bg-black text-white border border-white"

  const durationMins = useMemo(() => {
    if (!selected) return null
    const ms = new Date(selected.endISO).getTime() - new Date(selected.startISO).getTime()
    return Math.max(0, Math.round(ms / 60000))
  }, [selected])

  return (
    <div ref={scopeRef} className="w-full grid place-items-center">
      <div ref={portalRef} />
      <div className="w-full max-w-3xl grid place-items-center text-center rounded-2xl p-4 sm:p-5 gap-4">
        <div className="grid gap-2 place-items-center">
          <h2 className="text-lg sm:text-xl font-semibold">Book a Time</h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!!dateLabel && (
              <span
                className={`text-sm px-2 py-1 rounded-md border ${isLightTheme ? "border-black/30 text-black/85" : "border-white/40 text-app/85"}`}
              >
                {dateLabel}
              </span>
            )}
            <span
              className={`text-sm px-2 py-1 rounded-md border ${isLightTheme ? "border-black/30 text-black/85" : "border-white/40 text-app/85"}`}
            >
              Times shown in <strong className={isLightTheme ? "text-black" : "text-app"}>{browserTz}</strong>
            </span>
          </div>
        </div>

        <div className="w-full grid place-items-center gap-1.5">
          <span className={isLightTheme ? "text-sm text-black/80" : "text-sm text-app/80"}>Type</span>
          <div
            className={`inline-flex items-center gap-2 bg-transparent p-1 rounded-lg border ${isLightTheme ? "border-black/30" : "border-white/40"}`}
            role="group"
            aria-label="Booking type"
          >
            <button
              type="button"
              aria-pressed={kind === "consultation"}
              onClick={() => setKind("consultation")}
              className={`${chipBase} ${kind === "consultation" ? chipActiveCls : chipInactiveCls}`}
            >
              Consultation
            </button>
            <button
              type="button"
              aria-pressed={kind === "appointment"}
              onClick={() => setKind("appointment")}
              className={`${chipBase} ${kind === "appointment" ? chipActiveCls : chipInactiveCls}`}
            >
              Appointment
            </button>
          </div>
        </div>

        <div
          className={`w-full max-w-3xl grid gap-2 rounded-lg border p-3 sm:p-3.5 text-left ${isLightTheme ? "border-black/30 bg-white" : "border-white/40 bg-card"}`}
          aria-live="polite"
        >
          {kind === "consultation" ? (
            <>
              <div className={isLightTheme ? "text-sm sm:text-base text-black/90" : "text-sm sm:text-base text-app/90"}>
                You’re picking the <strong>start time</strong> of a consultation. Typical length: <strong>15–30 min</strong>
              </div>
              <div className={isLightTheme ? "text-xs sm:text-sm text-black/70" : "text-xs sm:text-sm text-app/80"}>
                What can extend it: size/placement complexity, number of references, decision-making, video vs in-person, paperwork.
              </div>
            </>
          ) : (
            <>
              <div className={isLightTheme ? "text-sm sm:text-base text-black/90" : "text-sm sm:text-base text-app/90"}>
                You’re picking the <strong>start time</strong> of your appointment. Some artists require a <strong>non-refundable deposit</strong>.
              </div>
              <div className={isLightTheme ? "text-xs sm:text-sm text-black/70" : "text-xs sm:text-sm text-app/80"}>
                Cancellation policy: within <strong>72 hours</strong> of start date; <strong>deposits and booking fees may not be refunded.</strong>
              </div>
            </>
          )}
        </div>

        <div className="w-full">
          <div
            className={`rounded-lg border w-full max-w-3xl p-2 sm:p-2.5 mx-auto bg-transparent ${isLightTheme ? "border-black/30" : "border-white/40"}`}
          >
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
              {combinedTimes.map((t) => {
                const key = timeKeyLocal(t)
                const avail = availableStartsByKey.get(key)
                const isDisabled = !avail
                const isActive = !!avail && selected?.startISO === avail.startISO

                const slotBase = "px-2.5 py-[2.5px] rounded-lg min-w-[88px] text-sm sm:text-base text-center outline-none"
                const slotEnabled = isLightTheme
                  ? "bg-transparent text-black border border-black/30 focus-visible:ring-2"
                  : "bg-transparent text-app border border-white/40 focus-visible:ring-2"
                const slotActive = "bg-black text-white border border-white"
                const slotDisabled = isLightTheme
                  ? "bg-white text-black/60 border border-black/15 opacity-60 saturate-50 pointer-events-none"
                  : "bg-elevated text-app/55 border border-white/20 opacity-60 saturate-50 pointer-events-none"

                return (
                  <button
                    key={t.toISOString()}
                    onClick={() => { if (avail) setSelected(avail) }}
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    className={`${slotBase} ${isDisabled ? slotDisabled : isActive ? slotActive : slotEnabled}`}
                    style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
                  >
                    {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                )
              })}
              {combinedTimes.length === 0 && (
                <div className={isLightTheme ? "w-full text-center text-sm sm:text-base py-2 text-black/70" : "w-full text-center text-sm sm:text-base py-2 text-app/70"}>
                  No times for this day.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={isLightTheme ? "text-sm sm:text-base text-black/80" : "text-sm sm:text-base text-app/80"}>
          {selected ? (
            <>
              Selected:{" "}
              <span className={isLightTheme ? "font-medium text-black" : "font-medium text-app"}>
                {new Date(selected.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>{" "}
              • <span className="font-medium capitalize">{kind}</span>
            </>
          ) : (
            "Select a time above."
          )}
        </div>

        <Button
          disabled={!canConfirm}
          onClick={() => setConfirmOpen(true)}
          className="px-4 py-2 rounded-xl font-medium outline-none focus-visible:ring-2 min-w-[160px] text-sm sm:text-base"
          style={{
            background: canConfirm ? "var(--fg)" : "color-mix(in oklab, var(--elevated) 80%, transparent)",
            color: canConfirm ? "var(--card)" : (isLightTheme ? "rgba(0,0,0,0.6)" : "color-mix(in oklab, var(--fg) 60%, transparent)"),
            border: `1px solid ${canConfirm ? "var(--fg)" : "var(--border)"}`
          }}
        >
          Confirm
        </Button>
      </div>

      <RDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <RDialogPortal container={portalRef.current ?? scopeRef.current ?? (typeof document !== "undefined" ? document.body : undefined)}>
          <RDialogOverlay
            className="fixed inset-0 z-[2147483600] bg-overlay"
            onPointerDownCapture={(ev) => ev.stopPropagation()}
          />
          <RDialogContent
            showCloseButton={false}
            className="z-[2147483646] max-w-md sm:max-w-lg w-[min(92vw,640px)] border rounded-2xl p-5 sm:p-6 text-center flex flex-col items-center justify-items-center"
            style={{
              background: isLightTheme ? "#ffffff" : "var(--card)",
              color: isLightTheme ? "#000000" : "var(--fg)",
              borderColor: isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)"
            }}
            onPointerDownCapture={(ev) => ev.stopPropagation()}
          >
            <div className="w-full relative">
              <button
                aria-label="Close"
                className="absolute right-2 top-2 rounded-md px-2 py-1 text-sm"
                onClick={() => {
                  swallowGestureTail()
                  setConfirmOpen(false)
                }}
              >
                ×
              </button>
            </div>

            <RDialogHeader className="space-y-2 w-full flex flex-col items-center text-center">
              <RDialogTitle className="text-xl sm:text-2xl font-semibold">
                Confirm your {kind}
              </RDialogTitle>
              <RDialogDescription
                id="confirm-desc"
                className={`text-sm ${isLightTheme ? "text-black/60" : "text-app/70"}`}
              >
                Review the details below. If everything looks good, accept to book this time. You can go back to choose a different slot.
              </RDialogDescription>
            </RDialogHeader>

            <div className="mt-4 grid place-items-center gap-3 w-full" aria-describedby="confirm-desc">
              {selected && (
                <>
                  <div className="text-lg sm:text-xl font-semibold">
                    {new Date(selected.startISO).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="text-base sm:text-lg font-medium">
                    {new Date(selected.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(selected.endISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="inline-flex flex-wrap items-center justify-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-md border text-xs sm:text-sm"
                      style={{ borderColor: isLightTheme ? "rgba(0,0,0,0.3)" : "var(--border)" }}
                    >
                      {browserTz}
                    </span>
                    {durationMins != null && (
                      <span
                        className="px-2.5 py-1 rounded-md border text-xs sm:text-sm"
                        style={{ borderColor: isLightTheme ? "rgba(0,0,0,0.3)" : "var(--border)" }}
                      >
                        {durationMins} min
                      </span>
                    )}
                    <span
                      className="px-2.5 py-1 rounded-md border text-xs sm:text-sm capitalize"
                      style={{ borderColor: isLightTheme ? "rgba(0,0,0,0.3)" : "var(--border)" }}
                    >
                      {kind}
                    </span>
                  </div>
                  <div className={isLightTheme ? "text-xs sm:text-sm text-black/55" : "text-xs sm:text-sm text-app/70"}>
                    You’ll see payment or deposit steps later if required by the artist’s policy.
                  </div>
                </>
              )}
            </div>

            <RDialogFooter className="mt-8 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  swallowGestureTail()
                  setConfirmOpen(false)
                }}
                className="min-w-[200px] h-12 text-base sm:text-lg rounded-xl bg-transparent"
                style={{ borderColor: isLightTheme ? "rgba(0,0,0,0.35)" : "var(--border)", color: isLightTheme ? "#000" : "var(--fg)" }}
                disabled={submitting}
              >
                Deny
              </Button>
              <Button
                onClick={(ev) => {
                  ev.stopPropagation()
                  handleAccept()
                }}
                className="min-w-[200px] h-12 text-base sm:text-lg rounded-xl"
                style={{ background: "#000000", color: "#ffffff", border: "1px solid #ffffff" }}
                disabled={submitting}
              >
                {submitting ? "Booking..." : "Accept"}
              </Button>
            </RDialogFooter>
          </RDialogContent>
        </RDialogPortal>
      </RDialog>
    </div>
  )
}