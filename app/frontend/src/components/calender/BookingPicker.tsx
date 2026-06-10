import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useAuth } from "@clerk/clerk-react"
import { apiGet, apiPost, getArtistPolicy } from "@/api/index.ts"
import { Button } from "@/components/ui/button"
import { X, Wallet, Gift } from "lucide-react"
import { socket, connectSocket } from "@/lib/socket"
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
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { useTheme } from "@/hooks/useTheme"
import DepositStep from "./DepositStep"
import ReviewPromptModal from "../dashboard/shared/ReviewPromptModal"

type Kind = "consultation" | "appointment"
type Props = { artistId: string; date?: Date; artistName?: string }
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

export default function BookingPicker({ artistId, date, artistName }: Props) {
  const scopeRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const { getToken, userId } = useAuth()
  const isLightTheme = theme === "light"

  const [kind, setKind] = useState<Kind>("consultation")
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [depositStepOpen, setDepositStepOpen] = useState(false)
  const [pendingBooking, setPendingBooking] = useState<any>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [lastBooking, setLastBooking] = useState<any>(null)

  const [depositPolicy, setDepositPolicy] = useState<any>(null)
  useEffect(() => {
    if (!artistId) return
    const ac = new AbortController()
    Promise.resolve(getArtistPolicy(artistId, ac.signal)).then(p => setDepositPolicy(p?.deposit || null)).catch(() => { })
    return () => ac.abort()
  }, [artistId])

  const depositCents = useMemo(() => {
    const p = depositPolicy || {}
    const appt = kind === "appointment" ? "tattoo_session" : "consultation"
    if (appt === "consultation" && (p.consultationFree ?? true)) return 0
    const mode = p.mode || "percent"
    if (mode === "flat") {
      const base = Math.max(0, Number(p.amountCents || 0))
      return appt === "tattoo_session" ? Math.max(base, 5000) : base
    }
    const minCents = Math.max(0, Number(p.minCents || 0), appt === "tattoo_session" ? 5000 : 0)
    const maxCents = Math.max(0, Number(p.maxCents || Infinity))
    return Math.min(minCents, maxCents)
  }, [depositPolicy, kind])

  const canConfirm = Boolean(selected && date)

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
      return "UTC"
    }
  }, [])

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
    if (userId) {
      connectSocket(getToken, userId)
    }
  }, [userId, getToken])

  useEffect(() => {
    const onBooked = () => refreshSlots()
    const onCancelled = () => refreshSlots()
    const onDenied = () => refreshSlots()
    window.addEventListener("ink:booking-created", onBooked as EventListener)
    window.addEventListener("ink:booking-cancelled", onCancelled as EventListener)
    window.addEventListener("ink:booking-denied", onDenied as EventListener)

    const handleSocketCancelled = (data: { artistId: string; date: string }) => {
      if (data.artistId === artistId && date && data.date === date.toISOString().slice(0, 10)) {
        window.dispatchEvent(new CustomEvent("ink:booking-cancelled"))
        refreshSlots()
      }
    }

    const handleSocketDenied = (data: { artistId: string; date: string }) => {
      if (data.artistId === artistId && date && data.date === date.toISOString().slice(0, 10)) {
        window.dispatchEvent(new CustomEvent("ink:booking-denied"))
        refreshSlots()
      }
    }

    socket.on("booking:cancelled", handleSocketCancelled)
    socket.on("booking:denied", handleSocketDenied)

    return () => {
      window.removeEventListener("ink:booking-created", onBooked as EventListener)
      window.removeEventListener("ink:booking-cancelled", onCancelled as EventListener)
      window.removeEventListener("ink:booking-denied", onDenied as EventListener)
      socket.off("booking:cancelled", handleSocketCancelled)
      socket.off("booking:denied", handleSocketDenied)
    }
  }, [refreshSlots, artistId, date])

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
      let booking
      if (kind === "consultation") {
        const durationMinutes = Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000)
        booking = await apiPost("/bookings/consultation", {
          artistId,
          startISO,
          durationMinutes,
          priceCents: 0
        })
        window.dispatchEvent(new CustomEvent("ink:booking-created", { detail: booking }))
        swallowGestureTail()
        setSelected(null)
        setConfirmOpen(false)
        toast.success(
          `${new Date(startISO).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} • ${new Date(startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(endISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          {
            position: "top-center",
            hideProgressBar: true,
            style: {
              background: isLightTheme ? "#ffffff" : "var(--card)",
              color: isLightTheme ? "#000000" : "var(--fg)",
              border: `1px solid ${isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)"}`,
              boxShadow: "0 10px 25px color-mix(in srgb, var(--fg) 8%, transparent)"
            }
          }
        )
        await refreshSlots()
      } else {
        const durationMinutes = Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000)
        booking = await apiPost("/bookings/session", {
          artistId,
          startISO,
          durationMinutes,
          priceCents: 0
        })
        window.dispatchEvent(new CustomEvent("ink:booking-created", { detail: booking }))

        const depositRequired = booking?.depositRequiredCents && booking.depositRequiredCents > 0
        const depositPaid = booking?.depositPaidCents && booking.depositPaidCents >= booking.depositRequiredCents

        if (depositRequired && !depositPaid) {
          setPendingBooking(booking)
          swallowGestureTail()
          setSelected(null)
          setConfirmOpen(false)
          setDepositStepOpen(true)
          setSubmitting(false)
          return
        }

        setLastBooking(booking)
        swallowGestureTail()
        setSelected(null)
        setConfirmOpen(false)
        toast.success(
          `${new Date(startISO).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} • ${new Date(startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(endISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          {
            position: "top-center",
            hideProgressBar: true,
            style: {
              background: isLightTheme ? "#ffffff" : "var(--card)",
              color: isLightTheme ? "#000000" : "var(--fg)",
              border: `1px solid ${isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)"}`,
              boxShadow: "0 10px 25px color-mix(in srgb, var(--fg) 8%, transparent)"
            }
          }
        )
        if (kind === "appointment" && artistName) {
          setTimeout(() => {
            setReviewModalOpen(true)
          }, 1000)
        }
        await refreshSlots()
      }
    } catch (err: any) {
      const msg = err?.body?.error || err?.body?.message || err?.message || "Failed to book"
      toast.error(String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const durationMins = useMemo(() => {
    if (!selected) return null
    const ms = new Date(selected.endISO).getTime() - new Date(selected.startISO).getTime()
    return Math.max(0, Math.round(ms / 60000))
  }, [selected])

  const PERIODS: { label: string; test: (h: number) => boolean }[] = [
    { label: "Morning", test: (h) => h < 12 },
    { label: "Afternoon", test: (h) => h >= 12 && h < 17 },
    { label: "Evening", test: (h) => h >= 17 },
  ]

  const renderSlot = (t: Date) => {
    const key = timeKeyLocal(t)
    const avail = availableStartsByKey.get(key)
    const isDisabled = !avail
    const isActive = !!avail && selected?.startISO === avail.startISO
    return (
      <button
        key={t.toISOString()}
        onClick={() => { if (avail) setSelected(avail) }}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className="px-2.5 py-1 rounded-lg text-sm text-center outline-none border transition focus-visible:ring-2 disabled:pointer-events-none"
        style={{
          cursor: isDisabled ? "not-allowed" : "pointer",
          borderColor: isActive ? "var(--fg)" : "var(--border)",
          background: isActive ? "var(--fg)" : "transparent",
          color: isActive ? "var(--bg)" : isDisabled ? "color-mix(in srgb, var(--fg) 38%, transparent)" : "var(--fg)",
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </button>
    )
  }

  return (
    <div ref={scopeRef} className="w-full">
      <div ref={portalRef} />
      <div className="flex flex-col items-center text-center rounded-2xl p-3 sm:p-4 gap-3 w-full">
        <div className="grid gap-2 place-items-center">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--fg)" }}>Book a Time</h2>
          <span
            className="text-xs px-2.5 py-1 rounded-full border"
            style={{ borderColor: "var(--border)", color: "color-mix(in srgb, var(--fg) 75%, transparent)" }}
          >
            Times shown in <strong style={{ color: "var(--fg)" }}>{browserTz}</strong>
          </span>
        </div>

        <div className="grid place-items-center gap-1.5">
          <span className="text-sm" style={{ color: "color-mix(in srgb, var(--fg) 75%, transparent)" }}>Type</span>
          <div
            className="relative grid grid-cols-2 w-[17rem] max-w-full p-1 rounded-full border select-none"
            style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
            role="group"
            aria-label="Booking type"
          >
            <span
              aria-hidden
              className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full transition-all duration-200 ease-out"
              style={{ background: "var(--fg)", left: kind === "consultation" ? "0.25rem" : "50%" }}
            />
            <button
              type="button"
              aria-pressed={kind === "consultation"}
              onClick={() => setKind("consultation")}
              className="relative z-10 py-1.5 text-sm font-semibold rounded-full transition-colors"
              style={{ color: kind === "consultation" ? "var(--bg)" : "var(--fg)" }}
            >
              Consultation
            </button>
            <button
              type="button"
              aria-pressed={kind === "appointment"}
              onClick={() => setKind("appointment")}
              className="relative z-10 py-1.5 text-sm font-semibold rounded-full transition-colors"
              style={{ color: kind === "appointment" ? "var(--bg)" : "var(--fg)" }}
            >
              Appointment
            </button>
          </div>
        </div>

        <div
          className="text-xs sm:text-sm rounded-full border px-3.5 py-1.5 max-w-[34rem]"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 50%, transparent)", color: "color-mix(in srgb, var(--fg) 72%, transparent)" }}
          aria-live="polite"
        >
          {kind === "consultation"
            ? "Pick a start time · consultations run ~15–30 min"
            : "Pick a start time · a non-refundable deposit may be required"}
        </div>

        <div className="text-xs sm:text-sm font-medium" style={{ color: "color-mix(in srgb, var(--fg) 58%, transparent)" }}>
          Select a time below · scroll for more options
        </div>

        <div className="w-full relative mx-auto max-w-[34rem]">
          <div
            className="rounded-xl border p-3 w-full max-h-[240px] overflow-y-auto"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 40%, transparent)" }}
          >
            {combinedTimes.length === 0 ? (
              <div className="text-center text-sm sm:text-base py-2" style={{ color: "color-mix(in srgb, var(--fg) 65%, transparent)" }}>
                No times for this day.
              </div>
            ) : (
              PERIODS.map((p) => {
                const items = combinedTimes.filter((t) => p.test(t.getHours()))
                if (!items.length) return null
                return (
                  <div key={p.label} className="mb-3 last:mb-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-center" style={{ color: "color-mix(in srgb, var(--fg) 50%, transparent)" }}>
                      {p.label}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {items.map(renderSlot)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {selected && (
          <div className="text-sm sm:text-base" style={{ color: "color-mix(in srgb, var(--fg) 75%, transparent)" }}>
            Selected:{" "}
            <span className="font-semibold" style={{ color: "var(--fg)" }}>
              {new Date(selected.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>{" "}
            • <span className="font-semibold capitalize" style={{ color: "var(--fg)" }}>{kind}</span>
          </div>
        )}

        <Button
          disabled={!canConfirm}
          onClick={() => setConfirmOpen(true)}
          className="px-4 py-2 rounded-xl font-medium outline-none focus-visible:ring-2 text-sm sm:text-base"
          style={{
            background: canConfirm ? "var(--fg)" : "color-mix(in srgb, var(--elevated) 80%, transparent)",
            color: canConfirm ? "var(--card)" : (isLightTheme ? "rgba(0,0,0,0.6)" : "color-mix(in srgb, var(--fg) 60%, transparent)"),
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
            className="z-[2147483646] border rounded-2xl p-4 sm:p-6 text-center flex flex-col items-center justify-items-center"
            aria-describedby="confirm-desc"
            style={{
              background: "var(--card)",
              color: "var(--fg)",
              borderColor: "var(--border)",
              width: "100%",
              maxWidth: "min(92vw, 26rem)",
              maxHeight: "90dvh",
              overflowY: "auto"
            }}
            onPointerDownCapture={(ev) => ev.stopPropagation()}
          >
            <button
              aria-label="Close"
              className="absolute top-3.5 right-3.5 grid place-items-center h-8 w-8 rounded-full border hover:bg-elevated/60 transition-colors"
              onClick={() => {
                swallowGestureTail()
                setConfirmOpen(false)
              }}
              style={{ color: "var(--fg)", borderColor: "var(--border)", background: "var(--elevated)", zIndex: 10 }}
            >
              <X className="h-4 w-4" />
            </button>

            <RDialogHeader className="space-y-1.5 flex flex-col items-center text-center">
              <RDialogTitle className="text-lg sm:text-2xl font-semibold">
                Confirm your {kind}
              </RDialogTitle>
              <RDialogDescription
                id="confirm-desc"
                className={`text-[13px] sm:text-sm ${isLightTheme ? "text-black/60" : "text-app/70"}`}
              >
                Review the details below. If everything looks good, accept to book this time. You can go back to choose a different slot.
              </RDialogDescription>
            </RDialogHeader>

            <div className="mt-3 sm:mt-4 w-full grid place-items-center gap-2.5" aria-describedby="confirm-desc">
              {selected && (
                <>
                  <div className="w-full max-w-sm rounded-2xl border px-4 py-4 text-center" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                    <div className="text-base sm:text-lg font-bold">
                      {new Date(selected.startISO).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                    </div>
                    <div className="mt-0.5 text-sm font-medium opacity-80">
                      {new Date(selected.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(selected.endISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full border text-[11px]" style={{ borderColor: "var(--border)" }}>{browserTz}</span>
                      {durationMins != null && (
                        <span className="px-2 py-0.5 rounded-full border text-[11px]" style={{ borderColor: "var(--border)" }}>{durationMins} min</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full border text-[11px] capitalize" style={{ borderColor: "var(--border)" }}>{kind}</span>
                    </div>
                  </div>

                  <div className="w-full max-w-sm flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {depositCents > 0 ? <Wallet className="h-4 w-4 opacity-70" /> : <Gift className="h-4 w-4 opacity-70" />}
                      Deposit due now
                    </span>
                    <span className="text-base font-bold">
                      {depositCents > 0 ? `$${(depositCents / 100).toFixed(2)}` : "Free"}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-60 max-w-sm text-center">
                    {depositCents > 0
                      ? "Holds your booking and is applied to your final cost — the balance is paid with the artist at the studio."
                      : kind === "consultation"
                        ? "This artist offers consultations at no charge."
                        : "No deposit is required for this booking."}
                  </p>
                </>
              )}
            </div>

            <RDialogFooter className="mt-5 sm:mt-6 w-full flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => {
                  swallowGestureTail()
                  setConfirmOpen(false)
                }}
                className="w-full sm:w-auto text-sm sm:text-base rounded-xl bg-transparent"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={(ev) => {
                  ev.stopPropagation()
                  handleAccept()
                }}
                className="w-full sm:w-auto text-sm sm:text-base rounded-xl hover:opacity-90"
                style={{ background: "var(--fg)", color: "var(--bg)", border: "1px solid var(--fg)" }}
                disabled={submitting}
              >
                {submitting ? "Booking..." : `Confirm${depositCents > 0 ? ` · $${(depositCents / 100).toFixed(2)}` : ""}`}
              </Button>
            </RDialogFooter>
          </RDialogContent>
        </RDialogPortal>
      </RDialog>

      <RDialog open={depositStepOpen} onOpenChange={setDepositStepOpen}>
        <RDialogPortal container={portalRef.current ?? scopeRef.current ?? (typeof document !== "undefined" ? document.body : undefined)}>
          <RDialogOverlay
            className="fixed inset-0 z-[2147483600] bg-overlay"
            onPointerDownCapture={(ev) => ev.stopPropagation()}
          />
          <RDialogContent
            showCloseButton={false}
            className="z-[2147483646] border rounded-2xl p-5 sm:p-6"
            style={{
              background: isLightTheme ? "#ffffff" : "var(--card)",
              color: isLightTheme ? "#000000" : "var(--fg)",
              borderColor: isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)",
              overflowY: "auto",
              maxWidth: "600px"
            }}
            onPointerDownCapture={(ev) => ev.stopPropagation()}
          >
            <button
              aria-label="Close"
              className="absolute top-4 right-4 rounded-md px-2 py-1 text-sm hover:bg-elevated/50 transition-colors"
              onClick={() => {
                swallowGestureTail()
                setDepositStepOpen(false)
              }}
              style={{
                color: isLightTheme ? "#000000" : "var(--fg)",
                zIndex: 10
              }}
            >
              ×
            </button>
            {pendingBooking && (
              <DepositStep
                booking={pendingBooking}
                onDepositPaid={async () => {
                  setDepositStepOpen(false)
                  setLastBooking(pendingBooking)
                  setPendingBooking(null)
                  await refreshSlots()
                  toast.success(
                    `Appointment booked successfully! Deposit paid.`,
                    {
                      position: "top-center",
                      hideProgressBar: true,
                      style: {
                        background: isLightTheme ? "#ffffff" : "var(--card)",
                        color: isLightTheme ? "#000000" : "var(--fg)",
                        border: `1px solid ${isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)"}`,
                        boxShadow: "0 10px 25px color-mix(in srgb, var(--fg) 8%, transparent)"
                      }
                    }
                  )
                  if (kind === "appointment" && artistName) {
                    setTimeout(() => {
                      setReviewModalOpen(true)
                    }, 1000)
                  }
                }}
                onCancel={() => {
                  setDepositStepOpen(false)
                  setPendingBooking(null)
                }}
              />
            )}
          </RDialogContent>
        </RDialogPortal>
      </RDialog>

      <ReviewPromptModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        artistId={artistId}
        artistName={artistName || "the artist"}
        bookingId={lastBooking?._id}
      />

      <ToastContainer
        position="top-center"
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        hideProgressBar
        toastStyle={{
          background: isLightTheme ? "#ffffff" : "var(--card)",
          color: isLightTheme ? "#000000" : "var(--fg)",
          border: `1px solid ${isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)"}`,
          boxShadow: "0 10px 25px color-mix(in srgb, var(--fg) 8%, transparent)"
        }}
        className="text-sm"
        style={{ zIndex: 2147483647 }}
      />
    </div>
  )
}