import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useAuth } from "@clerk/clerk-react"
import { apiGet, apiPost, getArtistPolicy, getBookingGate, getSignatureStatus, getDocument, signDocument, type IntakeForm, type LegalDocument } from "@/api/index.ts"
import { Button } from "@/components/ui/button"
import { X, Wallet, Gift, Clock, Sunrise, Sun, Moon, CheckCircle2 } from "lucide-react"
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
import CardOnFileStep from "./CardOnFileStep"
import { type FormState, EMPTY_INTAKE, IntakeFields, intakeIsComplete, toPayload } from "@/components/dashboard/client/intakeFormShared"

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
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([])
  const [maxSessions, setMaxSessions] = useState(1)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [step, setStep] = useState<"review" | "waiver" | "intake" | "confirm">("review")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [depositStepOpen, setDepositStepOpen] = useState(false)
  const [cardStepOpen, setCardStepOpen] = useState(false)
  const [pendingBooking, setPendingBooking] = useState<any>(null)
  const [waiverSigned, setWaiverSigned] = useState(false)
  const [waiverDoc, setWaiverDoc] = useState<LegalDocument | null>(null)
  const [waiverName, setWaiverName] = useState("")
  const [signingWaiver, setSigningWaiver] = useState(false)
  const [intakePayload, setIntakePayload] = useState<Partial<IntakeForm> | null>(null)
  const [intakeForm, setIntakeForm] = useState<FormState>(EMPTY_INTAKE)
  const setIntakeField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setIntakeForm((f) => ({ ...f, [key]: value }))
  }, [])

  const [depositPolicy, setDepositPolicy] = useState<any>(null)
  useEffect(() => {
    if (!artistId) return
    const ac = new AbortController()
    Promise.resolve(getArtistPolicy(artistId, ac.signal)).then(p => setDepositPolicy(p?.deposit || null)).catch(() => { })
    return () => ac.abort()
  }, [artistId])

  useEffect(() => {
    if (!artistId) return
    const ac = new AbortController()
    Promise.resolve(getBookingGate(artistId, userId || undefined, ac.signal))
      .then((g: any) => setMaxSessions(Math.max(1, Number(g?.maxSessions || 1))))
      .catch(() => setMaxSessions(1))
    return () => ac.abort()
  }, [artistId, userId])

  const effectiveMax = kind === "appointment" ? maxSessions : 1
  const isSlotSelected = useCallback(
    (slot: Slot) => selectedSlots.some((s) => s.startISO === slot.startISO),
    [selectedSlots]
  )

  const toggleSlot = useCallback((slot: Slot) => {
    setSelectedSlots((prev) => {
      if (prev.some((s) => s.startISO === slot.startISO)) {
        return prev.filter((s) => s.startISO !== slot.startISO)
      }
      if (effectiveMax <= 1) return [slot]
      if (prev.length >= effectiveMax) {
        toast.info(`This piece is approved for up to ${effectiveMax} sittings.`, { position: "top-center", hideProgressBar: true })
        return prev
      }
      return [...prev, slot].sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
    })
  }, [effectiveMax])

  useEffect(() => {
    setSelectedSlots([])
  }, [kind])

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

  const canConfirm = selectedSlots.length >= 1

  const steps: Array<"review" | "waiver" | "intake" | "confirm"> =
    kind === "appointment" ? ["review", "waiver", "intake", "confirm"] : ["review", "confirm"]
  const stepIndex = Math.max(0, steps.indexOf(step))
  const goNext = () => setStep(steps[Math.min(stepIndex + 1, steps.length - 1)])
  const goBack = () => setStep(steps[Math.max(stepIndex - 1, 0)])

  const consentComplete =
    kind === "consultation" ? agreedToTerms : waiverSigned && !!intakePayload && agreedToTerms

  useEffect(() => {
    if (!confirmOpen) return
    setStep("review")
    setAgreedToTerms(false)
    setIntakePayload(null)
    setIntakeForm(EMPTY_INTAKE)
    setWaiverName("")
    if (kind !== "appointment") {
      setWaiverSigned(false)
      return
    }
    const ac = new AbortController()
      ; (async () => {
        try {
          const token = await getToken()
          const [st, doc] = await Promise.all([
            getSignatureStatus("client_waiver", {}, token, ac.signal),
            getDocument("client_waiver", ac.signal),
          ])
          setWaiverSigned(!!st?.signed)
          setWaiverDoc(doc)
        } catch {
          setWaiverSigned(false)
        }
      })()
    return () => ac.abort()
  }, [confirmOpen, kind, getToken])

  const signWaiverInline = async () => {
    if (!waiverName.trim()) return
    setSigningWaiver(true)
    try {
      const token = (await getToken()) ?? undefined
      await signDocument("client_waiver", { signatureName: waiverName.trim(), signerRole: "client" }, token)
      setWaiverSigned(true)
      setStep("intake")
    } catch (e: any) {
      toast.error(e?.message || "Couldn't sign the waiver", toastStyle)
    } finally {
      setSigningWaiver(false)
    }
  }

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

  const toastStyle = {
    position: "top-center" as const,
    hideProgressBar: true,
    style: {
      background: isLightTheme ? "#ffffff" : "var(--card)",
      color: isLightTheme ? "#000000" : "var(--fg)",
      border: `1px solid ${isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)"}`,
      boxShadow: "0 10px 25px color-mix(in srgb, var(--fg) 8%, transparent)"
    }
  }

  async function handleMultiAccept() {
    setSubmitting(true)
    try {
      const sessions = selectedSlots.map((s) => ({
        startISO: s.startISO,
        durationMinutes: Math.round((new Date(s.endISO).getTime() - new Date(s.startISO).getTime()) / 60000),
      }))
      const res = await apiPost("/bookings/multi-session", { artistId, sessions, priceCents: 0, intake: intakePayload })
      window.dispatchEvent(new CustomEvent("ink:booking-created", { detail: res }))
      swallowGestureTail()
      setSelectedSlots([])
      setConfirmOpen(false)
      toast.success(`${sessions.length}-session request sent`, toastStyle)
      await refreshSlots()
    } catch (err: any) {
      const msg = err?.body?.error || err?.body?.message || err?.message || "Failed to book"
      toast.error(String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAccept() {
    if (selectedSlots.length === 0) return
    if (kind === "appointment" && selectedSlots.length > 1) {
      return handleMultiAccept()
    }
    setSubmitting(true)
    const { startISO, endISO } = selectedSlots[0]
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
        setSelectedSlots([])
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
          priceCents: 0,
          intake: intakePayload
        })
        window.dispatchEvent(new CustomEvent("ink:booking-created", { detail: booking }))

        const depositRequired = booking?.depositRequiredCents && booking.depositRequiredCents > 0
        const depositPaid = booking?.depositPaidCents && booking.depositPaidCents >= booking.depositRequiredCents

        if (depositRequired && !depositPaid) {
          setPendingBooking(booking)
          swallowGestureTail()
          setSelectedSlots([])
          setConfirmOpen(false)
          setDepositStepOpen(true)
          setSubmitting(false)
          return
        }

        if (!import.meta.env.DEV) {
          setPendingBooking(booking)
          swallowGestureTail()
          setSelectedSlots([])
          setConfirmOpen(false)
          setCardStepOpen(true)
          setSubmitting(false)
          return
        }

        swallowGestureTail()
        setSelectedSlots([])
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
      }
    } catch (err: any) {
      const msg = err?.body?.error || err?.body?.message || err?.message || "Failed to book"
      toast.error(String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const PERIODS: { label: string; test: (h: number) => boolean; Icon: typeof Sunrise }[] = [
    { label: "Morning", test: (h) => h < 12, Icon: Sunrise },
    { label: "Afternoon", test: (h) => h >= 12 && h < 17, Icon: Sun },
    { label: "Evening", test: (h) => h >= 17, Icon: Moon },
  ]

  const renderSlot = (t: Date) => {
    const key = timeKeyLocal(t)
    const avail = availableStartsByKey.get(key)
    const isDisabled = !avail
    const isActive = !!avail && isSlotSelected(avail)
    return (
      <button
        key={t.toISOString()}
        onClick={() => { if (avail) toggleSlot(avail) }}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className="h-10 rounded-xl text-sm font-medium text-center outline-none border transition focus-visible:ring-2 disabled:pointer-events-none enabled:hover:ring-2 enabled:hover:ring-[color:var(--fg)]/25"
        style={{
          borderColor: isActive ? "var(--fg)" : "var(--border)",
          background: isActive ? "var(--fg)" : "transparent",
          color: isActive ? "var(--bg)" : isDisabled ? "color-mix(in srgb, var(--fg) 30%, transparent)" : "var(--fg)",
          opacity: isDisabled ? 0.5 : 1,
        }}
      >
        {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </button>
    )
  }

  return (
    <div ref={scopeRef} className="w-full h-full min-h-0 flex flex-col">
      <div ref={portalRef} />
      <div className="flex w-full flex-1 min-h-0 flex-col gap-3.5">
        <div
          className="relative grid grid-cols-2 w-full shrink-0 p-1 rounded-2xl border select-none"
          style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
          role="group"
          aria-label="Booking type"
        >
          <span
            aria-hidden
            className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl transition-all duration-200 ease-out"
            style={{ background: "var(--fg)", left: kind === "consultation" ? "0.25rem" : "50%" }}
          />
          <button
            type="button"
            aria-pressed={kind === "consultation"}
            onClick={() => setKind("consultation")}
            className="relative z-10 py-2 text-sm font-semibold rounded-xl transition-colors"
            style={{ color: kind === "consultation" ? "var(--bg)" : "var(--fg)" }}
          >
            Consultation
          </button>
          <button
            type="button"
            aria-pressed={kind === "appointment"}
            onClick={() => setKind("appointment")}
            className="relative z-10 py-2 text-sm font-semibold rounded-xl transition-colors"
            style={{ color: kind === "appointment" ? "var(--bg)" : "var(--fg)" }}
          >
            Appointment
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 shrink-0 text-xs" style={{ color: "color-mix(in srgb, var(--fg) 65%, transparent)" }}>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {kind === "consultation" ? "Consultations run ~15–30 min" : "A deposit may be required"}
          </span>
          <span className="whitespace-nowrap">
            Times in <strong style={{ color: "var(--fg)" }}>{browserTz}</strong>
          </span>
        </div>

        <div
          className="rounded-2xl border p-2.5 sm:p-3 w-full flex-1 min-h-0 max-h-[440px] overflow-y-auto"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 40%, transparent)" }}
        >
          {combinedTimes.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "color-mix(in srgb, var(--fg) 60%, transparent)" }}>
              No times available for this day.
            </div>
          ) : (
            PERIODS.map((p) => {
              const items = combinedTimes.filter((t) => p.test(t.getHours()))
              if (!items.length) return null
              const open = items.filter((t) => availableStartsByKey.has(timeKeyLocal(t))).length
              const Icon = p.Icon
              return (
                <div key={p.label} className="mb-4 last:mb-1">
                  <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>
                    <Icon className="h-3.5 w-3.5" />
                    <span>{p.label}</span>
                    <span className="ml-auto font-normal normal-case" style={{ color: "color-mix(in srgb, var(--fg) 45%, transparent)" }}>
                      {open} open
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {items.map(renderSlot)}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 shrink-0 rounded-2xl border p-3"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="min-w-0 text-left">
            {selectedSlots.length === 0 ? (
              <div className="text-sm" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>
                {effectiveMax > 1 ? `Pick up to ${effectiveMax} dates` : "Pick a time to continue"}
              </div>
            ) : selectedSlots.length === 1 ? (
              <>
                <div className="text-sm font-bold truncate" style={{ color: "var(--fg)" }}>
                  {new Date(selectedSlots[0].startISO).toLocaleDateString([], { month: "short", day: "numeric" })}
                  {" · "}
                  {new Date(selectedSlots[0].startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs capitalize" style={{ color: "color-mix(in srgb, var(--fg) 60%, transparent)" }}>
                  {effectiveMax > 1 ? `${kind} · 1 of ${effectiveMax}` : kind}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold truncate" style={{ color: "var(--fg)" }}>
                  {selectedSlots.length} sittings selected
                </div>
                <div className="text-xs" style={{ color: "color-mix(in srgb, var(--fg) 60%, transparent)" }}>
                  {selectedSlots.length} of {effectiveMax} · across {new Set(selectedSlots.map((s) => s.startISO.slice(0, 10))).size} dates
                </div>
              </>
            )}
          </div>
          <Button
            disabled={!canConfirm}
            onClick={() => setConfirmOpen(true)}
            className="shrink-0 px-5 py-2.5 rounded-xl font-semibold outline-none focus-visible:ring-2 text-sm"
            style={{
              background: canConfirm ? "var(--fg)" : "color-mix(in srgb, var(--elevated) 80%, transparent)",
              color: canConfirm ? "var(--card)" : (isLightTheme ? "rgba(0,0,0,0.6)" : "color-mix(in srgb, var(--fg) 60%, transparent)"),
              border: `1px solid ${canConfirm ? "var(--fg)" : "var(--border)"}`
            }}
          >
            {selectedSlots.length > 1 ? `Review (${selectedSlots.length})` : "Confirm"}
          </Button>
        </div>
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
                {step === "waiver"
                  ? "Consent & liability"
                  : step === "intake"
                    ? "Pre-appointment intake"
                    : step === "confirm"
                      ? "Almost done"
                      : `Confirm your ${kind}`}
              </RDialogTitle>
              <RDialogDescription id="confirm-desc" className="sr-only">
                Complete the steps to book your {kind}.
              </RDialogDescription>
              {steps.length > 1 && (
                <div className="flex items-center gap-1.5 pt-1" aria-hidden>
                  {steps.map((s, i) => (
                    <span
                      key={s}
                      className="h-1.5 rounded-full transition-all duration-200"
                      style={{
                        width: i === stepIndex ? "1.5rem" : "0.4rem",
                        background: i <= stepIndex ? "var(--fg)" : "color-mix(in srgb, var(--fg) 25%, transparent)",
                      }}
                    />
                  ))}
                </div>
              )}
            </RDialogHeader>

            <div className="mt-3 sm:mt-4 w-full grid place-items-center gap-2.5">
              {step === "review" && selectedSlots.length > 0 && (
                <>
                  {selectedSlots.length > 1 && (
                    <div className="w-full max-w-sm text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>
                      {selectedSlots.length} sittings for this piece
                    </div>
                  )}
                  {selectedSlots.map((slot, i) => (
                    <div key={slot.startISO} className="w-full max-w-sm rounded-2xl border px-4 py-3.5 text-center" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                      {selectedSlots.length > 1 && (
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "color-mix(in srgb, var(--fg) 50%, transparent)" }}>
                          Session {i + 1}
                        </div>
                      )}
                      <div className="text-base sm:text-lg font-bold">
                        {new Date(slot.startISO).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                      </div>
                      <div className="mt-0.5 text-sm font-medium opacity-80">
                        Starts {new Date(slot.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {selectedSlots.length === 1 && (
                        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full border text-[11px]" style={{ borderColor: "var(--border)" }}>{browserTz}</span>
                          <span className="px-2 py-0.5 rounded-full border text-[11px] capitalize" style={{ borderColor: "var(--border)" }}>{kind}</span>
                        </div>
                      )}
                    </div>
                  ))}

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

              {step === "waiver" && (
                <div className="w-full max-w-sm text-left">
                  {waiverSigned ? (
                    <div className="rounded-2xl border px-4 py-6 text-center" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                      <CheckCircle2 className="h-6 w-6 mx-auto opacity-90" />
                      <p className="mt-2 text-sm font-semibold">You've signed the consent &amp; liability waiver.</p>
                      <p className="mt-1 text-[11px] opacity-60">You're all set on this step.</p>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-56 overflow-y-auto ink-page-scroll rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                        <p className="whitespace-pre-wrap text-[12px] leading-relaxed opacity-80">{waiverDoc?.body || "Loading…"}</p>
                      </div>
                      <label className="block mt-3 text-xs text-subtle">Type your full legal name to sign</label>
                      <input
                        value={waiverName}
                        onChange={(e) => setWaiverName(e.target.value)}
                        placeholder="Full name"
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[color:var(--fg)]/40"
                        style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--fg)" }}
                      />
                      <p className="mt-1 text-[10px] opacity-60">
                        By signing you agree to this document{waiverDoc?.version ? ` (v${waiverDoc.version})` : ""}. Your name, timestamp, and IP are recorded.
                      </p>
                    </>
                  )}
                </div>
              )}

              {step === "intake" && (
                <div className="w-full max-w-sm text-left">
                  <IntakeFields form={intakeForm} set={setIntakeField} />
                  <p className="mt-2 text-[11px] opacity-60 text-center">All consent boxes (except photo) are required.</p>
                </div>
              )}

              {step === "confirm" && (
                <div className="w-full max-w-sm grid gap-2.5">
                  <div className="rounded-2xl border px-4 py-3 text-left" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                    <div className="text-sm font-semibold capitalize">
                      {kind} · {selectedSlots.length > 1
                        ? `${selectedSlots.length} sessions`
                        : selectedSlots[0]
                          ? new Date(selectedSlots[0].startISO).toLocaleDateString([], { month: "short", day: "numeric" })
                          : ""}
                    </div>
                    <div className="mt-0.5 text-xs opacity-70 flex items-center justify-between">
                      <span>Deposit due now</span>
                      <span className="font-bold">{depositCents > 0 ? `$${(depositCents / 100).toFixed(2)}` : "Free"}</span>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 text-[11px] sm:text-xs leading-relaxed cursor-pointer select-none text-left">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-neutral-700"
                    />
                    <span className={isLightTheme ? "text-black/70" : "text-app/80"}>
                      I have read and agree to Inkmity's{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: "var(--fg)" }}>Terms of Service</a>,
                      including the{" "}
                      <a href="/terms#refunds" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: "var(--fg)" }}>refund &amp; cancellation policy</a>{" "}
                      and{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: "var(--fg)" }}>Privacy Policy</a>.
                    </span>
                  </label>
                </div>
              )}
            </div>

            <RDialogFooter className="mt-5 sm:mt-6 w-full flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => {
                  if (stepIndex === 0) {
                    swallowGestureTail()
                    setConfirmOpen(false)
                  } else {
                    goBack()
                  }
                }}
                className="w-full sm:w-auto text-sm sm:text-base rounded-xl bg-transparent"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                disabled={submitting || signingWaiver}
              >
                {stepIndex === 0 ? "Cancel" : "Back"}
              </Button>

              {step === "review" && (
                <Button onClick={goNext} className="w-full sm:w-auto text-sm sm:text-base rounded-xl" style={{ background: "var(--fg)", color: "var(--bg)", border: "1px solid var(--fg)" }}>
                  Continue
                </Button>
              )}
              {step === "waiver" && (
                waiverSigned ? (
                  <Button onClick={() => setStep("intake")} className="w-full sm:w-auto text-sm sm:text-base rounded-xl" style={{ background: "var(--fg)", color: "var(--bg)", border: "1px solid var(--fg)" }}>
                    Continue
                  </Button>
                ) : (
                  <Button onClick={signWaiverInline} disabled={!waiverName.trim() || signingWaiver} className="w-full sm:w-auto text-sm sm:text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "var(--fg)", color: "var(--bg)", border: "1px solid var(--fg)" }}>
                    {signingWaiver ? "Signing…" : "Sign & continue"}
                  </Button>
                )
              )}
              {step === "intake" && (
                <Button
                  onClick={() => { setIntakePayload(toPayload(intakeForm)); setStep("confirm") }}
                  disabled={!intakeIsComplete(intakeForm)}
                  className="w-full sm:w-auto text-sm sm:text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--fg)", color: "var(--bg)", border: "1px solid var(--fg)" }}
                >
                  Continue
                </Button>
              )}
              {step === "confirm" && (
                <Button
                  onClick={(ev) => { ev.stopPropagation(); handleAccept() }}
                  className="w-full sm:w-auto text-sm sm:text-base rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--fg)", color: "var(--bg)", border: "1px solid var(--fg)" }}
                  disabled={submitting || !consentComplete}
                >
                  {submitting ? "Booking..." : `Confirm${depositCents > 0 ? ` · $${(depositCents / 100).toFixed(2)}` : ""}`}
                </Button>
              )}
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

      <RDialog open={cardStepOpen} onOpenChange={setCardStepOpen}>
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
              maxWidth: "480px"
            }}
            onPointerDownCapture={(ev) => ev.stopPropagation()}
          >
            <RDialogHeader className="sr-only">
              <RDialogTitle>Save your card</RDialogTitle>
              <RDialogDescription>Save a card on file for this appointment</RDialogDescription>
            </RDialogHeader>
            {pendingBooking && (
              <CardOnFileStep
                booking={pendingBooking}
                artistName={artistName}
                onSaved={async () => {
                  setCardStepOpen(false)
                  setPendingBooking(null)
                  await refreshSlots()
                  toast.success("Appointment booked — card saved.", toastStyle)
                }}
                onCancel={() => {
                  setCardStepOpen(false)
                  setPendingBooking(null)
                }}
              />
            )}
          </RDialogContent>
        </RDialogPortal>
      </RDialog>

      <ToastContainer
        position="top-center"
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        hideProgressBar
        style={{ zIndex: 2147483647 }}
      />
    </div>
  )
}