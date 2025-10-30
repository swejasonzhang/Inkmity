import { useEffect, useMemo, useRef, useState } from "react";
import BookingPicker from "../../calender/BookingPicker";
import CalendarPicker from "../../calender/CalendarPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useApi } from "@/lib/api";
import type { ArtistWithGroups } from "./ArtistPortfolio";
import StepBarRow from "./StepBarRow";

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
  const { request } = useApi();
  const apiOrigin =
    (import.meta as any)?.env?.VITE_API_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5005";

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [gate, setGate] = useState<Gate | null>(null);
  const sentRef = useRef(false);

  const [profileRefs, setProfileRefs] = useState<string[]>([]);
  const [desiredStyle, setDesiredStyle] = useState<string | undefined>(undefined);
  const [budgetRange, setBudgetRange] = useState<{ min?: number; max?: number }>({});
  const [placement, setPlacement] = useState<string | undefined>(undefined);
  const [size, setSize] = useState<string | undefined>(undefined);

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const ac = new AbortController();

    (async () => {
      try {
        if (artist?.clerkId) {
          const g = await request(`${apiOrigin}/messages/gate/${artist.clerkId}`, {
            method: "GET",
            signal: ac.signal as any,
          });
          setGate(g as Gate);
          if ((g as Gate)?.lastStatus === "pending" && !(g as Gate)?.allowed) {
            sentRef.current = true;
            setStatus("sent");
          }
        }
      } catch { }

      try {
        const me: any = await request(`${apiOrigin}/users/me`, {
          method: "GET",
          signal: ac.signal as any,
        });
        const refs: string[] = me?.references?.map((r: any) => r.url || r) || me?.referenceUrls || [];
        setProfileRefs((refs || []).filter(Boolean));
        setDesiredStyle(me?.preferredStyle || me?.style || me?.styles?.[0] || undefined);
        const min = me?.budgetMin ?? me?.budget?.min;
        const max = me?.budgetMax ?? me?.budget?.max;
        setBudgetRange({ min, max });
        setPlacement(me?.placement || undefined);
        setSize(me?.size || undefined);
      } catch { }
    })();

    return () => ac.abort();
  }, [apiOrigin, artist?.clerkId, request]);

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

  const preloadedMessage = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Hi ${artist.username}, I've taken a look at your work and I'm interested!`);
    const sizeTxt = size ? `size ${size}` : "a tattoo";
    const placeTxt = placement ? ` near the area ${placement}` : "";
    const styleTxt = desiredStyle ? ` in ${desiredStyle}` : "";
    parts.push(`I want to get a tattoo with ${sizeTxt}${placeTxt}${styleTxt}.`);
    if (profileRefs.length) {
      parts.push("Here are some reference images:");
      for (const u of profileRefs.slice(0, 10)) parts.push(`- ${u}`);
      if (profileRefs.length > 10) parts.push(`- +${profileRefs.length - 10} more`);
    }
    if (budgetRange.min != null || budgetRange.max != null) {
      const min = budgetRange.min != null ? `$${budgetRange.min}` : "";
      const max = budgetRange.max != null ? `$${budgetRange.max}` : "";
      const dash = budgetRange.min != null && budgetRange.max != null ? "–" : "";
      parts.push(`Budget: ${min}${dash}${max}`.trim());
    }
    parts.push("Would you be open to working together?");
    return parts.join("\n");
  }, [artist.username, size, placement, desiredStyle, profileRefs, budgetRange.min, budgetRange.max, date]);

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
        meta: {
          style: desiredStyle || null,
          size: size || null,
          placement: placement || null,
          budgetMin: budgetRange.min ?? null,
          budgetMax: budgetRange.max ?? null,
          targetDate: date ? date.toISOString() : null,
          referenceUrls: profileRefs,
          stylesSnapshot: desiredStyle ? [desiredStyle] : [],
        },
      };
      const res: any = await request(`${apiOrigin}/messages/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const ok = typeof res?.ok === "boolean" ? res.ok : true;
      if (!ok) throw Object.assign(new Error(res?.error || `HTTP ${res?.status || 500}`), { status: res?.status, body: res });

      sentRef.current = true;
      setStatus("sent");
      setGate((g) => ({ ...(g || { allowed: false, declines: 0, blocked: false, lastStatus: "pending" }), lastStatus: "pending" }));
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
        setGate((g) => ({ ...(g || { allowed: false, declines: 0, blocked: false, lastStatus: "pending" }), lastStatus: "pending" }));
        addPending();
        openMessages();
        onClose?.();
        return;
      }

      if (statusCode === 409 && /already_accepted/i.test(body?.error || "")) {
        setStatus("idle");
        setGate((g) => ({ ...(g || { allowed: true, declines: 0, blocked: false, lastStatus: "accepted" }) }));
        openMessages();
        onClose?.();
        return;
      }

      setStatus("error");
      setErrorMsg(msg);
    }
  };

  const handleNext = () => onGoToStep?.(2);

  return (
    <div className="w-full" style={{ background: "var(--card)", color: "var(--fg)" }}>
      <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
          <div className="py-2 sm:py-3">
            <div className="mx-auto w-full max-w-3xl px-2 sm:px-3">
              <StepBarRow
                active={1}
                onGoToStep={onGoToStep}
                rightLabel="Next: Reviews"
                onRightClick={handleNext}
                centerHint="Scroll to message and book"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-3 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        <Card className="w-full shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
          <CardHeader className="text-center space-y-1 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg break-words">Message {artist.username}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center px-2 sm:px-6">
            <div className="w-full mx-auto flex flex-col items-center justify-center gap-3 sm:gap-4 px-1 sm:px-4">
              <p
                className="px-3 py-2 rounded-md text-center w-full max-w-[36rem] text-[13px] sm:text-sm leading-5 sm:leading-6"
                style={{ background: "var(--elevated)", color: "var(--fg)" }}
              >
                Send a request to message. You will be able to chat once the artist accepts.
              </p>

              {status === "error" && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="w-full max-w-[36rem] px-3 py-2 rounded-md text-sm"
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
                className="transition w-full sm:w-auto text-base sm:text-sm border-0 min-h-[48px] sm:min-h-[56px]"
                style={{ background: "var(--elevated)", color: "var(--fg)" }}
              >
                {status === "sending" ? "Sending..." : isPending ? "Request Pending" : "Send Request"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full shadow-none" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
          <CardHeader className="text-center space-y-1 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Book an appointment</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 items-stretch">
              <div className="min-h-[360px] sm:min-h-[420px]">
                <CalendarPicker
                  date={date}
                  month={month}
                  onDateChange={setDate}
                  onMonthChange={setMonth}
                  startOfToday={startOfToday}
                />
              </div>
              <div
                className="flex items-center justify-center min-h-[360px] sm:min-h-[480px] rounded-md px-2"
                style={{ background: "var(--elevated)" }}
              >
                <div className="w-full max-w-[920px] p-2 sm:p-3">
                  <BookingPicker artistId={artist.clerkId} date={date} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 sm:hidden border-t"
        style={{
          background: "color-mix(in oklab, var(--card) 96%, transparent)",
          borderColor: "var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto max-w-screen-md px-3 py-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={onBack}
              className="col-span-1 w-full text-sm border-0 min-h-[48px]"
              style={{ background: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
              variant="outline"
            >
              Back
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={status === "sending" || isPending}
              className="col-span-2 w-full text-sm min-h-[48px]"
              style={{ background: "var(--elevated)", color: "var(--fg)" }}
            >
              {status === "sending" ? "Sending..." : isPending ? "Pending" : "Send Request"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}