import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import BookingPicker from "../../calender/BookingPicker";
import CalendarPicker from "../../calender/CalendarPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useApi, isAbortError, API_URL } from "@/api";
import type { ArtistWithGroups } from "./ArtistPortfolio";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const { getToken } = useAuth();
  const apiOrigin =
    (import.meta as any)?.env?.VITE_API_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5005";

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [gate, setGate] = useState<Gate | null>(null);
  const [gateReady, setGateReady] = useState(true);
  const [clientProfile, setClientProfile] = useState<{ messageToArtists?: string; references?: string[] } | null>(null);
  const sentRef = useRef(false);
  const fetchingRef = useRef(false);
  const lastArtistIdRef = useRef<string | undefined>(undefined);
  const requestRef = useRef(request);
  const initialRenderRef = useRef(true);
  
  useEffect(() => {
    requestRef.current = request;
  }, [request]);

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
        const g = await requestRef.current(`${apiOrigin}/messages/gate/${artistId}`, {
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
          console.error("[ArtistBooking] gate fetch failed", { artistId, error: e });
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
  }, [apiOrigin, artist?.clerkId]);

  useEffect(() => {
    const handler = () => {};
    window.addEventListener("ink:open-booking", handler as EventListener);
    return () => window.removeEventListener("ink:open-booking", handler as EventListener);
  }, []);

  const isPending = gate === null ? false : (gate?.lastStatus === "pending" && !gate?.allowed) || status === "sent";
  const hasExistingChat = gate === null ? false : !!(gate?.allowed || gate?.lastStatus === "accepted");

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        console.log("[ArtistBooking] Fetching client profile from:", `${API_URL}/users/me`);
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
          credentials: "include",
        });
        console.log("[ArtistBooking] Response status:", res.status, res.ok);
        if (!cancelled && res.ok) {
          const data = await res.json();
          console.log("[ArtistBooking] Client profile data:", data);
          console.log("[ArtistBooking] messageToArtists:", data.messageToArtists);
          console.log("[ArtistBooking] references:", data.references);
          setClientProfile({
            messageToArtists: data.messageToArtists || "",
            references: data.references || [],
          });
        } else if (!cancelled) {
          const errorText = await res.text();
          console.error("[ArtistBooking] Failed to fetch client profile - Status:", res.status, "Response:", errorText);
        }
      } catch (e) {
        console.error("[ArtistBooking] Failed to fetch client profile - Error:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const preloadedMessage = useMemo(() => {
    console.log("[ArtistBooking] Computing preloadedMessage, clientProfile:", clientProfile);
    if (clientProfile?.messageToArtists?.trim()) {
      const msg = clientProfile.messageToArtists.trim();
      console.log("[ArtistBooking] Using profile message:", msg);
      return msg;
    }
    console.log("[ArtistBooking] No message found in profile, returning empty string");
    return "";
  }, [clientProfile?.messageToArtists]);

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
    console.log("[ArtistBooking] handleSendMessage - preloadedMessage:", preloadedMessage);
    console.log("[ArtistBooking] handleSendMessage - preMsg (trimmed):", preMsg);
    console.log("[ArtistBooking] handleSendMessage - clientProfile:", clientProfile);
    if (!preMsg) {
      console.error("[ArtistBooking] Message is empty, cannot send");
      setStatus("error");
      setErrorMsg("Message is empty.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      const profileRefs = clientProfile?.references || [];
      const payload = {
        artistId: artist.clerkId,
        text: preMsg,
        references: profileRefs,
        referenceUrls: profileRefs,
        workRefs: profileRefs,
        type: "request",
        meta: {
          style: null,
          size: null,
          placement: null,
          budgetMin: null,
          budgetMax: null,
          targetDate: date ? date.toISOString() : null,
          referenceUrls: profileRefs,
          workRefs: profileRefs,
          refs: profileRefs,
          stylesSnapshot: []
        }
      };
      console.log("[ArtistBooking] Sending request to:", `${apiOrigin}/messages/request`);
      console.log("[ArtistBooking] Request payload:", payload);
      const res: any = await request(`${apiOrigin}/messages/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("[ArtistBooking] Request response:", res);
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
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        <Card className="w-full shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
          <CardHeader className="text-center space-y-1 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg break-words">Message {artist.username}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center px-2 sm:px-6">
            <div className="w-full mx-auto flex flex-col items-center justify-center gap-3 sm:gap-4 px-1 sm:px-4">
              <p className="px-3 py-2 rounded-full text-center w-full max-w-[36rem] text-[13px] sm:text-sm leading-5 sm:leading-6" style={{ background: "var(--elevated)", color: "var(--fg)" }}>
                {hasExistingChat ? "You already have an open conversation with this artist. Please resume your chat below." : "Send a request to message. You will be able to chat once the artist accepts."}
              </p>
              {status === "error" && (
                <div role="alert" aria-live="assertive" className="w-full max-w-[36rem] px-3 py-2 rounded-md text-sm" style={{ background: "color-mix(in oklab, var(--danger) 15%, var(--elevated))", color: "var(--fg)" }}>
                  {errorMsg}
                </div>
              )}
              <span className="sr-only" aria-live="polite">
                {status === "sending" ? "Sending request" : isPending ? "Request pending" : hasExistingChat ? "Conversation already exists" : ""}
              </span>
              {hasExistingChat ? (
                <Button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("ink:open-messages"));
                    onClose?.();
                  }}
                  className="w-full sm:w-auto text-base sm:text-sm min-h-[48px] sm:min-h-[56px] rounded-full"
                  style={{ background: "var(--elevated)", color: "var(--fg)" }}
                >
                  Open Messages
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={status === "sending" || isPending}
                  className="w-full sm:w-auto text-base sm:text-sm border-0 min-h-[48px] sm:min-h-[56px]"
                  style={{ background: "var(--elevated)", color: "var(--fg)" }}
                >
                  {status === "sending" ? "Sending..." : isPending ? "Request Pending" : "Send Request"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full shadow-none ink-no-anim" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)", transition: "none !important", animation: "none !important" } as React.CSSProperties}>
          <CardHeader className="text-center space-y-1 px-3 sm:px-6 ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
            <CardTitle className="text-base sm:text-lg ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>Book an appointment</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-5 ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 items-stretch ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
              <div className="min-h-[360px] sm:min-h-[420px] ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
                <CalendarPicker date={date} month={month} onDateChange={setDate} onMonthChange={setMonth} startOfToday={startOfToday} />
              </div>
              <div className="flex items-center justify-center min-h-[360px] sm:min-h-[480px] rounded-md px-2 ink-no-anim" style={{ background: "var(--elevated)", color: "var(--fg)", transition: "none !important", animation: "none !important" } as React.CSSProperties}>
                <div className="w-full max-w-[920px] p-2 sm:p-3 ink-no-anim" style={{ transition: "none !important", animation: "none !important" } as React.CSSProperties}>
                  <BookingPicker artistId={artist.clerkId} date={date} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 sm:hidden border-t" style={{ background: "color-mix(in oklab, var(--card) 96%, transparent)", borderColor: "var(--border)", color: "var(--fg)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto max-w-screen-md px-3 py-2">
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={onBack} className="col-span-1 w-full text-sm border-0 min-h-[48px]" style={{ background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }} variant="outline">
              Back
            </Button>
            {hasExistingChat ? (
              <Button
                onClick={() => {
                  openMessages();
                  onClose?.();
                }}
                className="col-span-2 w-full text-sm min-h-[48px] rounded-full"
                style={{ background: "var(--elevated)", color: "var(--fg)" }}
              >
                Open Messages
              </Button>
            ) : (
              <Button
                onClick={handleSendMessage}
                disabled={status === "sending" || isPending}
                className="col-span-2 w-full text-sm min-h-[48px]"
                style={{ background: "var(--elevated)", color: "var(--fg)" }}
              >
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
          boxShadow: "0 10px 25px color-mix(in oklab, var(--fg) 8%, transparent)"
        }}
        className="text-sm"
        style={{ zIndex: 2147483647 }}
      />
    </div>
  );
}