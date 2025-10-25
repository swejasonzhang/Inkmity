import { createPortal } from "react-dom";
import { Bot, MessageSquare, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  onAssistantOpen: () => void;
  portalTarget?: Element | null;
  assistantLocked?: boolean;
  messagesContent?: React.ReactNode;
  unreadCount?: number;
};

export default function FloatingBar({
  onAssistantOpen,
  portalTarget,
  assistantLocked = true,
  messagesContent,
  unreadCount = 0,
}: Props) {
  const [isMdUp, setIsMdUp] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const msgBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMdUp("matches" in e ? e.matches : (e as MediaQueryList).matches);
    handler(mql);
    mql.addEventListener?.("change", handler as EventListener);
    return () => mql.removeEventListener?.("change", handler as EventListener);
  }, []);

  useEffect(() => {
    const open = () => setMsgOpen(true);
    const close = () => setMsgOpen(false);
    window.addEventListener("ink:open-messages", open);
    window.addEventListener("ink:close-messages", close);
    return () => {
      window.removeEventListener("ink:open-messages", open);
      window.removeEventListener("ink:close-messages", close);
    };
  }, []);

  useEffect(() => {
    if (!msgOpen) return;
    const onDocPointer = (e: Event) => {
      const root = msgBtnRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      setMsgOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer, true);
    document.addEventListener("touchstart", onDocPointer, true);
    return () => {
      document.removeEventListener("mousedown", onDocPointer, true);
      document.removeEventListener("touchstart", onDocPointer, true);
    };
  }, [msgOpen]);

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
    "bg-app text-card inline-flex items-center gap-2 rounded-full pointer-events-auto border border-app shadow-md transition focus:outline-none focus:ring-2 focus:ring-app/40";
  const assistantBtnClass = [btnCommon, "px-3 md:px-4 py-3"].join(" ");

  const btnW = msgOpen ? (isMdUp ? 640 : 420) : 160; // wider when closed
  const btnH = msgOpen ? (isMdUp ? 720 : 600) : 52;

  const btnRadius = msgOpen ? 16 : 9999;
  const btnPadding = msgOpen ? "0px" : "0.75rem 1rem";

  const bar = (
    <div className="fixed inset-x-0 z-[1000] pointer-events-none" style={{ bottom: pad.bottom }}>
      <div className="relative w-full" style={{ height: Math.max(btnH, 52) }}>
        <div className="absolute bottom-0 pointer-events-auto" style={{ left: pad.left }}>
          <button
            type="button"
            onClick={assistantLocked ? undefined : onAssistantOpen}
            className={assistantBtnClass}
            aria-label="Open assistant"
            aria-disabled={assistantLocked}
            disabled={assistantLocked}
            title={assistantLocked ? "Assistant is temporarily locked" : "Open assistant"}
          >
            <Bot size={18} aria-hidden />
            <span className="text-sm font-medium hidden md:inline">Assistant</span>
            {assistantLocked && <Lock size={14} className="hidden md:inline-block ml-1 opacity-90" aria-hidden />}
          </button>
        </div>

        <div className="absolute bottom-0 pointer-events-auto" style={{ right: pad.right }}>
          <div
            ref={msgBtnRef}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!msgOpen) setMsgOpen(true);
            }}
            onKeyDown={(e) => {
              if (!msgOpen && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setMsgOpen(true);
              }
            }}
            className={btnCommon}
            aria-label={msgOpen ? "Messages" : "Open messages"}
            title={msgOpen ? "Messages" : "Open messages"}
            style={{
              willChange: "width,height",
              width: btnW,
              height: btnH,
              borderRadius: btnRadius,
              padding: btnPadding,
              transition:
                "width 520ms cubic-bezier(0.22,1,0.36,1), height 520ms cubic-bezier(0.22,1,0.36,1), border-radius 520ms ease, padding 360ms ease",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
            }}
          >
            {!msgOpen ? (
              <div className="flex h-full items-center justify-center gap-2 px-1">
                <MessageSquare size={18} />
                <span className="text-sm font-medium hidden md:inline">Messages</span>
                {unreadCount > 0 && (
                  <span
                    className="ml-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold px-2 min-w-[22px] h-[18px]"
                    style={{ background: "#ef4444", color: "#fff" }}
                    aria-label={`${unreadCount} unread`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex h-full w-full flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-app">
                  <div className="flex items-center gap-2 font-semibold">
                    <MessageSquare size={16} />
                    <span>Messages</span>
                  </div>
                  <div className="shrink-0">
                    <span className="sr-only">Close messages</span>
                    <X
                      size={18}
                      className="p-1 rounded-full hover:bg-elevated cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMsgOpen(false);
                      }}
                    />
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

  return createPortal(bar, portalTarget ?? document.body);
}