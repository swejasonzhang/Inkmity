import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import BookingPicker from "../../calender/BookingPicker";
import CalendarPicker from "../../calender/CalendarPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useApi } from "@/lib/api";
import type { ArtistWithGroups } from "./ArtistPortfolio";

type BookingProps = {
  artist: ArtistWithGroups;
  onMessage: (artist: ArtistWithGroups, preloadedMessage: string) => void | Promise<void>;
  onBack?: () => void;
  onClose?: () => void;
  onGoToStep?: (step: 0 | 1 | 2) => void;
};

type Gate = {
  allowed: boolean;
  lastStatus: "pending" | "accepted" | "declined" | null;
  declines: number;
  blocked: boolean;
};

export default function ArtistBooking({ artist, onBack, onClose, onGoToStep }: BookingProps) {
  const prefersReducedMotion = useReducedMotion();
  const { request } = useApi();
  const apiOrigin =
    (import.meta as any)?.env?.VITE_API_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5005";

  const preloadedMessage = useMemo(
    () => `Hi ${artist.username}, I've taken a look at your work and I'm interested!\nWould you be open to my ideas?`,
    [artist.username]
  );

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [gate, setGate] = useState<Gate | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    let alive = true;
    async function loadGate() {
      try {
        const g = await request(`${apiOrigin}/messages/gate/${artist.clerkId}`, { method: "GET" });
        if (alive) setGate(g as Gate);
        if ((g as Gate)?.lastStatus === "pending" && !(g as Gate)?.allowed) {
          sentRef.current = true;
          setStatus("sent");
        }
      } catch {
        /* ignore */
      }
    }
    if (artist?.clerkId) loadGate();
    return () => {
      alive = false;
    };
  }, [artist?.clerkId, apiOrigin, request]);

  const isPending = (gate?.lastStatus === "pending" && !gate?.allowed) || status === "sent";

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [date, setDate] = useState<Date | undefined>(startOfToday);
  const [month, setMonth] = useState<Date>(startOfToday);

  const openMessages = () => window.dispatchEvent(new CustomEvent("ink:open-messages"));
  const addPending = () =>
    window.dispatchEvent(
      new CustomEvent("ink:add-pending-conversation", {
        detail: { artistId: artist.clerkId, username: artist.username },
      })
    );

  const handleSendMessage = async () => {
    if (sentRef.current || status === "sending") return;
    if (!artist.clerkId) {
      setStatus("error");
      setErrorMsg("Artist clerkId missing.");
      return;
    }
    if (!artist.username) {
      setStatus("error");
      setErrorMsg("Artist username missing.");
      return;
    }
    if (!preloadedMessage.trim()) {
      setStatus("error");
      setErrorMsg("Message is empty.");
      return;
    }

    setStatus("sending");
    setErrorMsg("");
    try {
      const payload = { artistId: artist.clerkId, text: preloadedMessage, meta: {} };
      const res: any = await request(`${apiOrigin}/messages/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const ok = typeof res?.ok === "boolean" ? res.ok : true;
      if (!ok) throw Object.assign(new Error(res?.error || `HTTP ${res?.status || 500}`), { status: res?.status });

      sentRef.current = true;
      setStatus("sent");
      setGate((g) => ({ ...(g || { allowed: false, declines: 0, blocked: false, lastStatus: "pending" }), lastStatus: "pending" }));
      addPending();
      openMessages();
      onClose?.();
    } catch (err: any) {
      if (err?.status === 409 || /already_pending/i.test(err?.message)) {
        sentRef.current = true;
        setStatus("sent");
        setGate((g) => ({ ...(g || { allowed: false, declines: 0, blocked: false, lastStatus: "pending" }), lastStatus: "pending" }));
        addPending();
        openMessages();
        onClose?.();
        return;
      }
      setStatus("error");
      setErrorMsg(err?.message || "Failed to send message.");
    }
  };

  const handleNext = () => onGoToStep?.(2);

  return (
    <div className="w-full mt-5 pb-10" style={{ background: "var(--card)", color: "var(--fg)" }}>
      <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
          <div className="py-3 sm:py-4">
            <div className="mx-auto w-full max-w-3xl flex items-center justify-evenly gap-4 sm:gap-6 py-2 sm:py-3 px-2 sm:px-3">
              <div className="justify-self-end">
                <div className="flex items-center gap-3 sm:gap-4">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                      aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                      className="h-2.5 w-6 rounded-full transition-all"
                      style={{
                        background:
                          i === 1
                            ? "color-mix(in oklab, var(--fg) 95%, transparent)"
                            : "color-mix(in oklab, var(--fg) 40%, transparent)",
                      }}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <div className="justify-self-center">
                <motion.div
                  initial={{ y: 0, opacity: 0.95 }}
                  animate={prefersReducedMotion ? {} : { y: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium shadow-sm"
                  style={{
                    background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                    color: "color-mix(in oklab, var(--fg) 90%, transparent)",
                  }}
                >
                  <ChevronDown className="h-4 w-4" />
                  <span>Scroll to explore the message the artist and book an appointment</span>
                </motion.div>
                <div className="sm:hidden h-6" />
              </div>

              <div className="justify-self-start">
                <div className="inline-flex items-center gap-2 sm:gap-3 flex-nowrap whitespace-nowrap">
                  <Button
                    onClick={onBack}
                    className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm border-0"
                    style={{ background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                    variant="outline"
                  >
                    Back: Portfolio
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm border-0"
                    style={{ background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                    variant="outline"
                  >
                    Next: Reviews
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-0 grid grid-cols-1 gap-6 lg:gap-8 pb-8">
        <Card className="w-full shadow-none" style={{ border: "1px solid var(--border)" }}>
          <CardHeader className="text-center space-y-1">
            <CardTitle>Message {artist.username}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-full mx-auto flex flex-col items-center justify-center gap-4 sm:gap-6 px-4">
              <p
                className="px-4 py-2 rounded-md text-center w-full max-w-[28rem] text-[13px] sm:text-sm leading-5 sm:leading-6"
                style={{ background: "var(--elevated)", color: "var(--fg)" }}
              >
                Send a request to message. You will be able to chat once the artist accepts.
              </p>
              {status === "error" && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="w-full max-w-[28rem] px-3 py-2 rounded-md text-sm"
                  style={{ background: "color-mix(in oklab, var(--danger) 15%, var(--elevated))", color: "var(--fg)" }}
                >
                  {errorMsg}
                </div>
              )}
              <span className="sr-only" aria-live="polite">
                {status === "sending" ? "Sending request" : isPending ? "Request pending" : ""}
              </span>
              <Button
                type="button"
                onClick={handleSendMessage}
                disabled={status === "sending" || isPending}
                className="transition w-full sm:w-auto border-0"
                style={{ background: "var(--elevated)", color: "var(--fg)" }}
              >
                {status === "sending" ? "Sending..." : isPending ? "Request Pending" : "Send Request"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full shadow-none" style={{ border: "1px solid var(--border)" }}>
          <CardHeader className="text-center space-y-1">
            <CardTitle>Book an appointment</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
              <CalendarPicker date={date} month={month} onDateChange={setDate} onMonthChange={setMonth} startOfToday={startOfToday} />
              <div className="flex items-center justify-center min-h-[480px] rounded-md" style={{ background: "var(--elevated)" }}>
                <div className="w-full max-w-[920px] p-3">
                  <BookingPicker artistId={artist.clerkId} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}