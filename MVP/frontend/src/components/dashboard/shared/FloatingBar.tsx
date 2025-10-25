import { createPortal } from "react-dom";
import { Bot, MessageSquare, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
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
      setClearedConvos((prev) => {
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
    setClearedConvos((prev) => {
      const incoming = new Set(unreadConversationIds);
      const next = new Set<string>();
      prev.forEach((id) => {
        if (incoming.has(id)) next.add(id);
      });
      return next;
    });
  }, [unreadConversationIds?.join("|")]);

  useEffect(() => {
    if (!msgOpen) return;
    const onDocPointer = (e: Event) => {
      const root = msgBtnRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      setMsgOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMsgOpen(false);
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

  const toInt = (n: unknown) => {
    const v = typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : 0;
    return v < 0 ? 0 : v;
  };

  const unreadConvoCount = Array.isArray(unreadConversationIds)
    ? unreadConversationIds.filter((id) => !clearedConvos.has(id)).length
    : toInt(unreadConversationsCount);

  // 1 if any pending request exists, else 0
  const requestCount =
    typeof requestExists === "boolean"
      ? requestExists ? 1 : 0
      : Array.isArray(pendingRequestIds)
      ? (pendingRequestIds.length > 0 ? 1 : 0)
      : toInt(pendingRequestsCount) > 0
      ? 1
      : 0;

  const totalUnreadMessages =
    typeof unreadMessagesTotal === "number" ? unreadMessagesTotal : toInt(unreadCount);

  const derivedTotal = totalUnreadMessages + requestCount;

  useEffect(() => {
    console.log("badge -> unreadMsgs:", totalUnreadMessages, "requests(0|1):", requestCount, "derivedTotal:", derivedTotal);
  }, [totalUnreadMessages, requestCount, derivedTotal]);

  const pad = {
    left: isMdUp
      ? "calc(1.85rem + 10px + env(safe-area-inset-left, 0px))"
      : "calc(0.9rem + 8px + env(safe-area-inset-left, 0px))",
    right: isMdUp
      ? "calc(1.85rem + 10px + env(safe-area-inset-right, 0px))"
      : "calc(0.9rem + 8px + env(safe-area-inset-right, 0px))",
    bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
  };

  const btnCommon =
    "bg-app text-card inline-flex items-center justify-center gap-2 rounded-full pointer-events-auto border border-app shadow-md transition focus:outline-none focus:ring-2 focus:ring-app/40";
  const collapsedHeight = 44;
  const assistantBtnClass = [btnCommon, "px-3 md:px-4"].join(" ");

  const btnW = msgOpen ? (isMdUp ? 1200 : 400) : 160;
  const btnH = msgOpen ? (isMdUp ? 760 : 460) : collapsedHeight;
  const btnRadius = msgOpen ? 16 : 9999;

  const Badge = ({ value, label }: { value: number; label?: string }) => (
    <span
      className="ml-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold px-2 min-w-[22px] h-[18px]"
      style={{ background: value > 0 ? "#ef4444" : "#6b7280", color: "#fff" }}
      aria-label={label ? `${value} ${label}` : `${value}`}
      title={label ? `${value} ${label}` : `${value}`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );

  const bar = (
    <div className="fixed inset-x-0 z-[1000] pointer-events-none" style={{ bottom: pad.bottom }}>
      <div className="relative w-full" style={{ height: Math.max(btnH, collapsedHeight) }}>
        <div className="absolute bottom-0 pointer-events-auto flex items-center" style={{ left: pad.left, height: collapsedHeight }}>
          <button
            type="button"
            onClick={assistantLocked ? undefined : onAssistantOpen}
            className={assistantBtnClass}
            aria-label="Open assistant"
            aria-disabled={assistantLocked}
            disabled={assistantLocked}
            title={assistantLocked ? "Assistant is temporarily locked" : "Open assistant"}
            style={{ height: collapsedHeight }}
          >
            <Bot size={18} aria-hidden />
            <span className="text-sm font-medium hidden md:inline">Assistant</span>
            {assistantLocked && <Lock size={14} className="hidden md:inline-block ml-1 opacity-90" aria-hidden />}
          </button>
        </div>

        <div className="absolute bottom-0 pointer-events-auto flex items-center" style={{ right: pad.right, height: btnH }}>
          <div
            ref={msgBtnRef}
            className={btnCommon}
            aria-label={msgOpen ? "Messages" : "Open messages"}
            aria-expanded={msgOpen}
            style={{
              willChange: "width,height",
              width: btnW,
              height: btnH,
              borderRadius: btnRadius,
              transition:
                "width 900ms cubic-bezier(0.22,1,0.36,1), height 900ms cubic-bezier(0.22,1,0.36,1), border-radius 900ms ease, padding 700ms ease",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!msgOpen ? (
              <button
                type="button"
                onClick={() => setMsgOpen(true)}
                className="flex h-full w-full items-center justify-center gap-2 px-2 focus:outline-none"
                title="Open messages"
                aria-label="Open messages"
              >
                <MessageSquare size={18} />
                <span className="text-sm font-medium hidden md:inline">Messages</span>
                <Badge value={derivedTotal} label="unread + requests" />
              </button>
            ) : (
              <div className="flex h-full w-full flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-app">
                  <div className="flex items-center gap-2 font-semibold">
                    <MessageSquare size={16} />
                    <span>Messages</span>
                    <span className="ml-2 text-[11px] px-2 h-[18px] inline-flex items-center rounded-full" style={{ background: "#111827", color: "#fff" }}>
                      {unreadConvoCount} unread convos
                    </span>
                    <span className="ml-2 text-[11px] px-2 h-[18px] inline-flex items-center rounded-full" style={{ background: "#111827", color: "#fff" }}>
                      {requestCount} {requestCount === 1 ? "request" : "requests"}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <span className="sr-only">Close messages</span>
                    <button
                      type="button"
                      className="p-1 rounded-full hover:bg-elevated"
                      onClick={() => setMsgOpen(false)}
                      aria-label="Close messages"
                      title="Close messages"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">{messagesContent}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(bar, portalTarget ?? document.body);
}
