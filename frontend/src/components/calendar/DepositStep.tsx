import { useState, useEffect } from "react"
import { useAuth } from "@clerk/clerk-react"
import { checkoutDeposit, getBooking } from "@/api/index.ts"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"
import { formatCurrency } from "@/lib/format"
import { CreditCard, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "react-toastify"

type Booking = {
  _id: string
  artistId: string
  startAt: string
  endAt: string
  depositRequiredCents?: number
  depositPaidCents?: number
}

type Props = {
  booking: Booking
  onDepositPaid: () => void
  onCancel: () => void
  artistName?: string
}

export default function DepositStep({ booking, onDepositPaid, onCancel, artistName }: Props) {
  const { getToken } = useAuth()
  const { theme } = useTheme()
  const isLightTheme = theme === "light"
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentBooking, setCurrentBooking] = useState<Booking>(booking)
  const depositRequired = currentBooking.depositRequiredCents || 0
  const depositPaid = currentBooking.depositPaidCents || 0
  const remaining = Math.max(0, depositRequired - depositPaid)
  const isPaid = depositPaid >= depositRequired

  useEffect(() => {
    const checkBookingStatus = async () => {
      try {
        const token = await getToken()
        const updated = await getBooking(currentBooking._id, token)
        if (updated) {
          setCurrentBooking(updated)
          const paid = updated.depositPaidCents ?? 0;
          const required = updated.depositRequiredCents ?? 0;
          if (paid >= required && required > 0) {
            onDepositPaid()
          }
        }
      } catch (err) {
        console.error("Failed to refresh booking status:", err)
      }
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get("paid") === "deposit") {
      checkBookingStatus()
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [currentBooking._id])

  const handlePayDeposit = async () => {
    if (processing || isPaid) return
    setProcessing(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await checkoutDeposit(currentBooking._id, token)

      if (response?.url) {
        window.location.href = response.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (err: any) {
      const msg = err?.body?.error || err?.body?.message || err?.message || "Failed to start deposit payment"
      setError(msg)
      toast.error(msg)
      setProcessing(false)
    }
  }

  const appointmentDate = new Date(currentBooking.startAt)
  const dateLabel = appointmentDate.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const timeLabel = `${appointmentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(currentBooking.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={`rounded-2xl border p-6 ${isLightTheme ? "border-black/20 bg-white" : "border-white/20 bg-card"}`}>
        {isPaid ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={`p-3 rounded-full ${isLightTheme ? "bg-elevated" : "bg-white/20"}`}>
              <CheckCircle2 className={`w-8 h-8 ${isLightTheme ? "text-app" : "text-app"}`} />
            </div>
            <div>
              <h3 className={`text-xl font-semibold mb-2 ${isLightTheme ? "text-black" : "text-app"}`}>
                Deposit Paid
              </h3>
              <p className={`text-sm ${isLightTheme ? "text-black/70" : "text-white/70"}`}>
                Your deposit of {formatCurrency(depositPaid)} has been successfully paid.
              </p>
            </div>
            <Button
              onClick={onDepositPaid}
              className="w-full rounded-xl font-medium"
              style={{
                background: isLightTheme ? "#000000" : "#ffffff",
                color: isLightTheme ? "#ffffff" : "#000000",
                border: "1px solid transparent",
              }}
            >
              Continue
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className={`text-xl font-semibold mb-4 ${isLightTheme ? "text-black" : "text-app"}`}>
                Deposit Required
              </h3>
              <div className={`space-y-3 mb-4 p-4 rounded-lg ${isLightTheme ? "bg-black/5" : "bg-white/5"}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isLightTheme ? "text-black/70" : "text-white/70"}`}>
                    Appointment Date
                  </span>
                  <span className={`text-sm font-medium ${isLightTheme ? "text-black" : "text-app"}`}>
                    {dateLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isLightTheme ? "text-black/70" : "text-white/70"}`}>
                    Time
                  </span>
                  <span className={`text-sm font-medium ${isLightTheme ? "text-black" : "text-app"}`}>
                    {timeLabel}
                  </span>
                </div>
                {artistName && (
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isLightTheme ? "text-black/70" : "text-white/70"}`}>
                      Artist
                    </span>
                    <span className={`text-sm font-medium ${isLightTheme ? "text-black" : "text-app"}`}>
                      {artistName}
                    </span>
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-lg border ${isLightTheme ? "border-black/20 bg-elevated" : "border-white/30 bg-white/10"}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 mt-0.5 ${isLightTheme ? "text-app" : "text-app"}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${isLightTheme ? "text-app" : "text-app"}`}>
                      Deposit Required
                    </p>
                    <p className={`text-xs ${isLightTheme ? "text-app" : "text-app"}`}>
                      A non-refundable deposit is required to secure your appointment. This deposit will be applied to your final cost.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mb-6 p-4 rounded-lg border ${isLightTheme ? "border-black/20 bg-black/5" : "border-white/20 bg-white/5"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-base ${isLightTheme ? "text-black/80" : "text-white/80"}`}>
                  Deposit Amount
                </span>
                <span className={`text-2xl font-bold ${isLightTheme ? "text-black" : "text-app"}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
              {depositPaid > 0 && (
                <div className={`text-xs ${isLightTheme ? "text-black/60" : "text-white/60"}`}>
                  Previously paid: {formatCurrency(depositPaid)} of {formatCurrency(depositRequired)}
                </div>
              )}
            </div>

            {error && (
              <div className={`mb-4 p-3 rounded-lg border ${isLightTheme ? "border-app bg-elevated" : "border-white/30 bg-white/20"}`}>
                <p className={`text-sm ${isLightTheme ? "text-app" : "text-app"}`}>
                  {error}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={processing}
                className="flex-1 rounded-xl font-medium"
                style={{
                  borderColor: isLightTheme ? "rgba(0,0,0,0.35)" : "var(--border)",
                  color: isLightTheme ? "#000" : "var(--fg)",
                  background: "transparent",
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayDeposit}
                disabled={processing || isPaid}
                className="flex-1 rounded-xl font-medium flex items-center justify-center gap-2"
                style={{
                  background: processing ? "color-mix(in srgb, var(--fg) 60%, transparent)" : (isLightTheme ? "#000000" : "#ffffff"),
                  color: processing ? "var(--fg)" : (isLightTheme ? "#ffffff" : "#000000"),
                  border: "1px solid transparent",
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay Deposit
                  </>
                )}
              </Button>
            </div>

            <p className={`mt-4 text-xs text-center ${isLightTheme ? "text-black/50" : "text-white/50"}`}>
              You will be redirected to a secure payment page to complete your deposit payment.
            </p>
          </>
        )}
      </div>
    </div>
  )
}