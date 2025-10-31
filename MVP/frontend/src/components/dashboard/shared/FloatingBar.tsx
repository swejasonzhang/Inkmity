import { createPortal } from "react-dom";
import { Bot, MessageSquare, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/useTheme";

type Role = "Client" | "Artist";

type Props = {
  role: Role;
  onAssistantOpen: () => void;
  portalTarget?: Element | null;
  assistantLocked?: boolean;
  messagesContent?: React.ReactNode;
  unreadCount?: number;
  unreadMessagesTotal?: number;
  requestExists?: boolean;
  unreadConversationsCount?: number;
  pendingRequestsCount?: number;
  unreadConversationIds?: string[];
  pendingRequestIds?: string[];
};

export default function FloatingBar({
  role,
  onAssistantOpen,
  portalTarget,
  assistantLocked = true,
  messagesContent,
  unreadCount = 0,
  unreadMessagesTotal,
  requestExists,
  unreadConversationsCount,
  pendingRequestsCount,
  unreadConversationIds,
  pendingRequestIds,
}: Props) {
  const [isMdUp, setIsMdUp] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const msgBtnRef = useRef<HTMLDivElement | null>(null);
  const [clearedConvos, setClearedConvos] = useState<Set<string>>(() => new Set());
  const [vp, setVp] = useState({ w: 375, h: 667 });
  const [vvBottom, setVvBottom] = useState(0);
  const { themeClass } = useTheme(portalTarget ?? undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMdUp(e.matches);
    setIsMdUp(mql.matches);
    if (typeof mql.addEventListener === "function") mql.addEventListener("change", onChange);
    else mql.addListener(onChange as any);
    return () => {
      if (typeof mql.removeEventListener === "function") mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange as any);
    };
  }, []);

  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    const open = () => setMsgOpen(true);
    const close = () => setMsgOpen(false);
    window.addEventListener("ink:open-messages", open as EventListener);
    window.addEventListener("ink:close-messages", close as EventListener);
    return () => {
      window.removeEventListener("ink:open-messages", open as EventListener);
      window.removeEventListener("ink:close-messages", close as EventListener);
    };
  }, []);

  useEffect(() => {
    const onConvoOpened = (e: Event) => {
      const id = (e as CustomEvent<string | { id: string }>).detail;
      const convoId = typeof id === "string" ? id : id?.id;
      if (!convoId) return;
      setClearedConvos(prev => {
        const next = new Set(prev);
        next.add(convoId);
        return next;
      });
    };
    const onConvoRead = onConvoOpened;
    window.addEventListener("ink:conversation-opened", onConvoOpened as EventListener);
    window.addEventListener("ink:conversation-read", onConvoRead as EventListener);
    return () => {
      window.removeEventListener("ink:conversation-opened", onConvoOpened as EventListener);
      window.removeEventListener("ink:conversation-read", onConvoRead as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!unreadConversationIds) return;
    setClearedConvos(prev => {
      const incoming = new Set(unreadConversationIds);
      const next = new Set<string>();
      prev.forEach(id => {
        if (incoming.has(id)) next.add(id);
      });
      return next;
    });
  }, [unreadConversationIds?.join("|")]);

  useEffect(() => {
    if (!msgOpen) return;
    const modalOpen = () => !!document.querySelector('[role="dialog"], [data-ink-modal]');
    const onDocPointer = (e: Event) => {
      if (modalOpen()) return;
      const root = msgBtnRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      setMsgOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !modalOpen()) setMsgOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer, true);
    document.addEventListener("touchstart", onDocPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDocPointer, true);
      document.removeEventListener("touchstart", onDocPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [msgOpen]);

  useEffect(() => {
    if (!window.visualViewport) return;
    const onVV = () => setVvBottom(Math.max(0, (window.visualViewport?.height ?? vp.h) - window.innerHeight));
    window.visualViewport.addEventListener("resize", onVV);
    window.visualViewport.addEventListener("scroll", onVV);
    onVV();
    return () => {
      window.visualViewport?.removeEventListener("resize", onVV);
      window.visualViewport?.removeEventListener("scroll", onVV);
    };
  }, [vp.h]);

  useEffect(() => {
    const body = document.body;
    if (!msgOpen) return;
    const scrollY = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      const y = Math.abs(parseInt(body.style.top || "0", 10)) || 0;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, y);
    };
  }, [msgOpen]);

  const toInt = (n: unknown) => {
    const v = typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : 0;
    return v < 0 ? 0 : v;
  };

  const unreadConvoCount = Array.isArray(unreadConversationIds)
    ? unreadConversationIds.filter(id => !clearedConvos.has(id)).length
    : toInt(unreadConversationsCount);

  const requestCount = role === "Artist"
    ? (typeof requestExists === "boolean"
      ? (requestExists ? 1 : 0)
      : Array.isArray(pendingRequestIds)
        ? (pendingRequestIds.length > 0 ? 1 : 0)
        : (toInt(pendingRequestsCount) > 0 ? 1 : 0))
    : 0;

  const totalUnreadMessages =
    typeof unreadMessagesTotal === "number" ? unreadMessagesTotal : toInt(unreadCount);

  const derivedTotal = totalUnreadMessages + (role === "Artist" ? requestCount : 0);

  const pad = {
    left: isMdUp ? "calc(1.85rem + 10px + env(safe-area-inset-left, 0px))" : "calc(0.9rem + 8px + env(safe-area-inset-left, 0px))",
    right: isMdUp ? "calc(1.85rem + 10px + env(safe-area-inset-right, 0px))" : "calc(0.9rem + 8px + env(safe-area-inset-right, 0px))",
    bottom: `calc(max(${vvBottom}px, 10px) + env(safe-area-inset-bottom, 0px))`,
  };

  const btnCommon =
    "bg-app text-app inline-flex items-center justify-center gap-2 rounded-full pointer-events-auto border border-app shadow-md transition focus:outline-none focus:ring-2 focus:ring-app/40";
  const collapsedHeight = 44;
  const assistantBtnClass = [btnCommon, "px-3 md:px-4"].join(" ");

  const MOBILE_CLOSED_W = 150;
  const MOBILE_OPEN_W = Math.min(Math.max(260, vp.w - 32), 420);
  const MOBILE_OPEN_H = Math.min(Math.max(360, vp.h - 140), 560);

  const PANEL_W = 320;
  const DESKTOP_OPEN_W = 1200;
  const DESKTOP_CLOSED_W = 160;

  const btnW = isMdUp
    ? (msgOpen ? DESKTOP_OPEN_W + (role === "Artist" ? PANEL_W : 0) : DESKTOP_CLOSED_W)
    : (msgOpen ? MOBILE_OPEN_W : MOBILE_CLOSED_W);

  const btnH = isMdUp ? (msgOpen ? 860 : collapsedHeight) : (msgOpen ? MOBILE_OPEN_H : collapsedHeight);

  useEffect(() => {
    document.documentElement.style.setProperty("--fb-safe", `${btnH + 8}px`);
    return () => {
      document.documentElement.style.removeProperty("--fb-safe");
    };
  }, [btnH]);

  const btnRadius = msgOpen ? 16 : 9999;

  const CountBadge = ({ value, label }: { value: number; label?: string }) => (
    <Badge
      className="ml-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold px-2 min-w-[22px] h-[18px] border"
      style={{
        background: value > 0 ? "var(--fg)" : "color-mix(in oklab, var(--fg), transparent 80%)",
        color: value > 0 ? "var(--bg)" : "var(--fg)",
        borderColor: "color-mix(in oklab, var(--border), transparent 60%)",
      }}
      aria-label={label ? `${value} ${label}` : `${value}`}
      title={label ? `${value} ${label}` : `${value}`}
    >
      {value > 99 ? "99+" : value}
    </Badge>
  );

  const bar = (
    <div className={`fixed inset-x-0 z-[1000] pointer-events-none ${themeClass}`} style={{ bottom: pad.bottom }}>
      <div className="relative w-full" style={{ height: Math.max(btnH, collapsedHeight) }}>
        <div className={`grid ${isMdUp ? "items-end" : "items-center"}`} style={{ gridTemplateColumns: "auto 1fr auto" }}>
          <div className="pointer-events-auto" style={{ paddingLeft: isMdUp ? pad.left : 12, height: collapsedHeight }}>
            <Button
              type="button"
              onClick={assistantLocked ? undefined : onAssistantOpen}
              className={assistantBtnClass}
              aria-label="Open assistant"
              aria-disabled={assistantLocked}
              disabled={assistantLocked}
              title={assistantLocked ? "Assistant is temporarily locked" : "Open assistant"}
              style={{ height: collapsedHeight }}
              variant="outline"
            >
              <Bot size={18} aria-hidden />
              <span className="text-sm font-medium hidden md:inline">Assistant</span>
              {assistantLocked && <Lock size={14} className="hidden md:inline-block ml-1 opacity-90" aria-hidden />}
            </Button>
          </div>
          <div />
          <div className="pointer-events-auto flex items-center justify-end" style={{ paddingRight: isMdUp ? pad.right : 12, height: btnH }}>
            <div
              ref={msgBtnRef}
              className={btnCommon}
              aria-label={msgOpen ? "Messages" : "Open messages"}
              aria-expanded={msgOpen}
              style={{
                willChange: "width,height",
                width: isMdUp ? btnW : Math.max(0, btnW - 50),
                height: btnH,
                borderRadius: btnRadius,
                transition: "width 900ms cubic-bezier(0.22,1,0.36,1), height 900ms cubic-bezier(0.22,1,0.36,1), border-radius 900ms ease, padding 700ms ease",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!msgOpen ? (
                <Button
                  type="button"
                  onClick={() => setMsgOpen(true)}
                  className="flex h-full w-full items-center justify-center gap-2 px-2 focus:outline-none"
                  title="Open messages"
                  aria-label="Open messages"
                  variant="ghost"
                >
                  <MessageSquare size={18} />
                  <span className="text-sm font-medium hidden md:inline">Messages</span>
                  <CountBadge value={derivedTotal} label={role === "Artist" ? "unread + requests" : "unread"} />
                </Button>
              ) : (
                <div className="flex-1 h-full w-full flex-col">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-app">
                    <div className="flex items-center gap-2 font-semibold">
                      <MessageSquare size={16} />
                      <span>Messages</span>
                      <Badge
                        className="ml-2 text-[11px] px-2 h-[18px] inline-flex items-center rounded-full"
                        style={{ background: "var(--fg)", color: "var(--bg)" }}
                      >
                        {unreadConvoCount} unread convos
                      </Badge>
                      {role === "Artist" && (
                        <Badge
                          className="ml-2 text-[11px] px-2 h-[18px] inline-flex items-center rounded-full"
                          style={{ background: "var(--fg)", color: "var(--bg)" }}
                        >
                          {requestCount} {requestCount === 1 ? "request" : "requests"}
                        </Badge>
                      )}
                    </div>
                    <div className="shrink-0">
                      <span className="sr-only">Close messages</span>
                      <Button
                        type="button"
                        className="p-1 rounded-full hover:bg-elevated"
                        onClick={() => setMsgOpen(false)}
                        aria-label="Close messages"
                        title="Close messages"
                        size="icon"
                        variant="ghost"
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 ">
                    <div className="h-full ">{messagesContent}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(bar, portalTarget ?? document.body);
}