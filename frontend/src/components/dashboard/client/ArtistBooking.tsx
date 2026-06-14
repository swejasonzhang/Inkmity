import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import BookingPicker from "../../calender/BookingPicker";
import CalendarPicker from "../../calender/CalendarPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LazyReveal from "@/components/ui/LazyReveal";
import { useApi, isAbortError, getBookingGate, type BookingGate, API_URL } from "@/api";
import type { ArtistWithGroups } from "./ArtistPortfolio";
import WaitlistButton from "./WaitlistButton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Lock, MessageSquare, CalendarDays, Send } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

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

export default function ArtistBooking({ artist, onBack, onClose }: BookingProps) {
  const { request } = useApi();
  const { user } = useUser();

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [minElapsed, setMinElapsed] = useState(false);
  const [gate, setGate] = useState<Gate | null>(null);
  const [gateReady, setGateReady] = useState(true);
  const [bookingGate, setBookingGate] = useState<BookingGate | null>(null);
  const [bookingGateReady, setBookingGateReady] = useState(false);
  const sentRef = useRef(false);
  const fetchingRef = useRef(false);
  const lastArtistIdRef = useRef<string | undefined>(undefined);
  const requestRef = useRef(request);
  const initialRenderRef = useRef(true);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), 2000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const artistId = artist?.clerkId;
    const artistChanged = lastArtistIdRef.current !== artistId;
    const isInitialRender = initialRenderRef.current;

    if (isInitialRender) {
      initialRenderRef.current = false;
    }

    if (artistChanged) {
      lastArtistIdRef.current = artistId;
      setGate(null);
      if (!isInitialRender) {
        setGateReady(false);
      }
    }

    if (fetchingRef.current) {
      return;
    }

    if (gateReady && gate !== null && !artistChanged && !isInitialRender) {
      return;
    }

    if (!artistId) {
      return;
    }

    const ac = new AbortController();
    let mounted = true;
    fetchingRef.current = true;

    (async () => {
      try {
        const g = await requestRef.current(`${API_URL}/messages/gate/${artistId}`, {
          method: "GET",
          signal: ac.signal as any
        });
        if (!mounted) {
          return;
        }
        setGate(g as Gate);
        setGateReady(true);
        if ((g as Gate)?.lastStatus === "pending" && !(g as Gate)?.allowed) {
          sentRef.current = true;
          setStatus("sent");
        }
      } catch (e) {
        if (!mounted) return;
        if (!isAbortError(e)) {
          if (mounted) setGateReady(true);
        }
      } finally {
        if (mounted) fetchingRef.current = false;
      }
    })();

    return () => {
      mounted = false;
      fetchingRef.current = false;
      ac.abort();
    };
  }, [artist?.clerkId]);

  const refreshBookingGate = useCallback(async () => {
    const artistId = artist?.clerkId;
    const clientId = user?.id;
    if (!artistId || !clientId) return;

    try {
      const gate = await getBookingGate(artistId, clientId);
      setBookingGate(gate);
      setBookingGateReady(true);
    } catch {
      setBookingGateReady(true);
    }
  }, [artist?.clerkId, user?.id]);

  useEffect(() => {
    const artistId = artist?.clerkId;
    const clientId = user?.id;
    if (!artistId || !clientId) return;

    refreshBookingGate();
  }, [artist?.clerkId, user?.id, refreshBookingGate]);

  useEffect(() => {
    if (!bookingGateReady || bookingGate?.enabled) return;

    let active = true;
    const interval = setInterval(() => {
      if (!active || bookingGate?.enabled) return;
      refreshBookingGate();
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [bookingGateReady, bookingGate?.enabled, refreshBookingGate]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ artistId?: string; clientId?: string }>).detail;
      if (detail?.artistId === artist?.clerkId && detail?.clientId === user?.id) {
        refreshBookingGate();
      }
    };
    window.addEventListener("ink:booking-enabled", handler as EventListener);
    return () => window.removeEventListener("ink:booking-enabled", handler as EventListener);
  }, [artist?.clerkId, user?.id, refreshBookingGate]);

  const isPending = gate === null ? false : (gate?.lastStatus === "pending" && !gate?.allowed) || status === "sent";
  const hasExistingChat = gate === null ? false : !!(gate?.allowed || gate?.lastStatus === "accepted");
  const messagePending = gate === null || !minElapsed;

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [date, setDate] = useState<Date | undefined>(startOfToday);
  const [month, setMonth] = useState<Date>(startOfToday);

  const openMessages = () => {
    window.dispatchEvent(new CustomEvent("ink:open-messages"));
  };
  const addPending = () => {
    window.dispatchEvent(
      new CustomEvent("ink:add-pending-conversation", {
        detail: { artistId: artist.clerkId, username: artist.username }
      })
    );
  };

  const preloadedMessage = useMemo(() => {
    const parts = [
      `Hi ${artist.username}, I've looked through your work and I'm interested.`,
      "I'm flexible on size and placement.",
      "I'm flexible on style.",
      "Are you interested in this project?"
    ]
      .filter(Boolean)
      .join(" ");
    return parts.replace(/\s+/g, " ").trim();
  }, [artist.username]);

  function mapError(status: number | undefined, body: any): string {
    const code = typeof body?.error === "string" ? body.error : "";
    if (status === 409 && /already_pending/i.test(code)) return "You already have a pending request with this artist.";
    if (status === 409 && /already_accepted/i.test(code)) return "You are already allowed to chat with this artist.";
    if (status === 403 && /blocked_by_declines/i.test(code)) return "Request limit reached for this artist.";
    if (status === 403 && /not_allowed/i.test(code)) return "You need an accepted request before you can chat.";
    if (status === 400 && /missing_fields/i.test(code)) return "Missing fields. Try again.";
    return body?.message || body?.error || "Failed to send request.";
  }

  const handleSendMessage = async () => {
    if (sentRef.current || status === "sending" || hasExistingChat) {
      return;
    }
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
    const preMsg = preloadedMessage.trim();
    if (!preMsg) {
      setStatus("error");
      setErrorMsg("Message is empty.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      const payload = {
        artistId: artist.clerkId,
        text: preMsg,
        references: [],
        referenceUrls: [],
        workRefs: [],
        type: "request",
        meta: {
          style: null,
          size: null,
          placement: null,
          budgetMin: null,
          budgetMax: null,
          targetDate: date ? date.toISOString() : null,
          referenceUrls: [],
          workRefs: [],
          refs: [],
          stylesSnapshot: []
        }
      };
      const res: any = await request(`${API_URL}/messages/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const ok = typeof res?.ok === "boolean" ? res.ok : true;
      if (!ok) throw Object.assign(new Error(res?.error || `HTTP ${res?.status || 500}`), { status: res?.status, body: res });
      sentRef.current = true;
      setStatus("sent");
      setGate(g => ({ ...(g || { allowed: false, declines: 0, blocked: false, lastStatus: "pending" }), lastStatus: "pending" }));
      addPending();
      openMessages();
      onClose?.();
    } catch (err: any) {
      const statusCode = err?.status ?? err?.response?.status;
      let body: any = err?.body;
      try {
        if (!body && err?.response) body = await err.response.json();
      } catch { }
      const msg = mapError(statusCode, body);
      if (statusCode === 409 && /already_pending/i.test(body?.error || "")) {
        sentRef.current = true;
        setStatus("sent");
        setGate(g => ({ ...(g || { allowed: false, declines: 0, blocked: false, lastStatus: "pending" }), lastStatus: "pending" }));
        addPending();
        openMessages();
        onClose?.();
        return;
      }
      if (statusCode === 409 && /already_accepted/i.test(body?.error || "")) {
        setStatus("idle");
        setGate(g => ({ ...(g || { allowed: true, declines: 0, blocked: false, lastStatus: "accepted" }) }));
        openMessages();
        onClose?.();
        return;
      }
      setStatus("error");
      setErrorMsg(msg);
    }
  };

  return (
    <div
      className="w-full ink-scope ink-no-anim"
      data-ink-no-theme="true"
      style={{
        background: "var(--card)",
        color: "var(--fg)",
        transition: "none !important",
        animation: "none !important"
      } as React.CSSProperties}
    >
      <div className="mx-auto max-w-screen-2xl px-1.5 sm:px-2.5 py-[10px] space-y-4 sm:space-y-5">
        <Card className="w-full shadow-none overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", paddingTop: 0, paddingBottom: 0, gap: 0 }}>
          <CardContent className="flex flex-col items-center justify-center px-4 sm:px-6 py-5">
            <div className="inline-flex items-center gap-2 text-base sm:text-lg font-bold" style={{ color: "var(--fg)" }}>
              <MessageSquare style={{ width: 18, height: 18 }} />
              Message {artist.username}
            </div>
            <p className="mt-2.5 text-center w-full max-w-[36rem] text-[13px] sm:text-sm leading-5 sm:leading-6" style={{ color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
              {hasExistingChat ? "You already have an open conversation with this artist. Resume your chat below." : "Send a request to message. You'll be able to chat once the artist accepts."}
            </p>
            {status === "error" && (
              <div role="alert" aria-live="assertive" className="mt-3 w-full max-w-[36rem] px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "color-mix(in srgb, var(--danger, #ef4444) 40%, var(--border))", background: "color-mix(in srgb, var(--danger, #ef4444) 12%, var(--elevated))", color: "var(--fg)" }}>
                {errorMsg}
              </div>
            )}
            <span className="sr-only" aria-live="polite">
              {status === "sending" ? "Sending request" : isPending ? "Request pending" : hasExistingChat ? "Conversation already exists" : ""}
            </span>
            {messagePending ? (
              <span className="ink-shimmer mt-4 h-[46px] w-44 rounded-full" />
            ) : hasExistingChat ? (
              <Button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("ink:open-messages"));
                  onClose?.();
                }}
                className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold min-h-[46px] px-6 rounded-full border transition hover:brightness-110 active:scale-[0.99]"
                style={{ background: "color-mix(in srgb, var(--elevated) 92%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}
              >
                <MessageSquare className="h-4 w-4" /> Open Messages
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSendMessage}
                disabled={status === "sending" || isPending}
                className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold min-h-[46px] px-6 rounded-full transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                style={{ background: "var(--fg)", color: "var(--bg)" }}
              >
                <Send className="h-4 w-4" />
                {status === "sending" ? "Sending..." : isPending ? "Request Pending" : "Send Request"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="w-full shadow-none overflow-hidden ink-no-anim" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", paddingTop: 0, paddingBottom: 0, gap: 0, transition: "none !important", animation: "none !important" } as React.CSSProperties}>
          <div className="flex items-center justify-center gap-2 pt-5 text-base sm:text-lg font-bold" style={{ color: "var(--fg)" }}>
            <CalendarDays style={{ width: 18, height: 18 }} />
            Book an appointment
          </div>
          <CardContent className="p-3 sm:p-5 ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
            <LazyReveal
              group="artist-booking"
              loading={!bookingGateReady}
              skeleton={
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  <div className="rounded-2xl border p-3 flex flex-col gap-2" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                    <div className="ink-shimmer h-5 w-32 mx-auto rounded flex-shrink-0" />
                    <div className="flex items-center justify-center gap-3 flex-shrink-0">
                      <div className="ink-shimmer h-4 w-16 rounded" />
                      <div className="ink-shimmer h-4 w-16 rounded" />
                      <div className="ink-shimmer h-4 w-16 rounded" />
                    </div>
                    <div className="ink-shimmer h-7 w-40 mx-auto rounded flex-shrink-0" />
                    <div className="grid grid-cols-7 gap-1 flex-shrink-0">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="ink-shimmer h-3 w-full rounded" />
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 42 }).map((_, i) => (
                        <div key={i} className="ink-shimmer aspect-square w-full rounded-md" />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border p-3 flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                    <div className="ink-shimmer h-6 w-32 mx-auto rounded-full flex-shrink-0" />
                    <div className="ink-shimmer h-10 w-full rounded-xl flex-shrink-0" />
                    <div className="grid grid-cols-3 auto-rows-fr gap-2 flex-1 min-h-0">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="ink-shimmer w-full h-full rounded-lg" />
                      ))}
                    </div>
                    <div className="ink-shimmer h-11 w-full rounded-full flex-shrink-0" />
                  </div>
                </div>
              }
            >
            {bookingGate?.enabled ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
                <div className="min-h-[300px] flex ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
                  <CalendarPicker date={date} month={month} onDateChange={setDate} onMonthChange={setMonth} startOfToday={startOfToday} />
                </div>
                <div className="min-h-[300px] rounded-2xl border px-2 py-2 ink-no-anim" style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)", transition: "none !important", animation: "none !important" } as React.CSSProperties}>
                  <div className="w-full max-w-[920px] p-2 sm:p-3 mx-auto ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
                    <BookingPicker artistId={artist.clerkId} date={date} artistName={artist.username} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-[300px] sm:min-h-[420px] flex flex-col items-center justify-center gap-4 px-4 text-center">
                <div className="grid place-items-center h-16 w-16 rounded-2xl border" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, color-mix(in srgb, var(--elevated) 95%, var(--fg) 5%), color-mix(in srgb, var(--elevated) 80%, var(--fg) 20%))" }}>
                  <Lock className="w-7 h-7" style={{ color: "var(--fg)" }} />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-lg font-bold" style={{ color: "var(--fg)" }}>
                    Appointments are currently locked
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
                    {bookingGate?.message || "To book an appointment, please message the artist first. Once they enable appointments for you, you'll be able to schedule here."}
                  </p>
                  {hasExistingChat && (
                    <p className="text-xs" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>
                      You already have a conversation with this artist. Check your messages for updates.
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <WaitlistButton artistId={artist.clerkId} />
                  <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>
                    Get notified when a spot opens — higher tiers are alerted first.
                  </p>
                </div>
              </div>
            )}
            </LazyReveal>
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 sm:hidden border-t" style={{ background: "color-mix(in srgb, var(--card) 96%, transparent)", borderColor: "var(--border)", color: "var(--fg)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto max-w-screen-md px-3 py-2">
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={onBack} className="col-span-1 w-full text-sm border min-h-[46px] rounded-full" style={{ background: "color-mix(in srgb, var(--elevated) 96%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }} variant="outline">
              Back
            </Button>
            {hasExistingChat ? (
              <Button
                onClick={() => {
                  openMessages();
                  onClose?.();
                }}
                className="col-span-2 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold min-h-[46px] rounded-full border"
                style={{ background: "color-mix(in srgb, var(--elevated) 92%, transparent)", borderColor: "var(--border)", color: "var(--fg)" }}
              >
                <MessageSquare className="h-4 w-4" /> Open Messages
              </Button>
            ) : (
              <Button
                onClick={handleSendMessage}
                disabled={status === "sending" || isPending}
                className="col-span-2 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold min-h-[46px] rounded-full disabled:opacity-60"
                style={{ background: "var(--fg)", color: "var(--bg)" }}
              >
                <Send className="h-4 w-4" />
                {status === "sending" ? "Sending..." : isPending ? "Pending" : "Send Request"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ToastContainer
        position="bottom-center"
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        toastStyle={{
          background: "var(--card)",
          color: "var(--fg)",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 25px color-mix(in srgb, var(--fg) 8%, transparent)"
        }}
        className="text-sm"
        style={{ zIndex: 2147483647 }}
      />
    </div>
  );
}