import { createPortal } from "react-dom";
import { Bot, MessageSquare, Lock } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  onAssistantOpen: () => void;
  onMessagesOpen: () => void;
  portalTarget?: Element | null;
  assistantLocked?: boolean;
};

export default function FloatingBar({
  onAssistantOpen,
  onMessagesOpen,
  portalTarget,
  assistantLocked = true,
}: Props) {
  const [tipX, setTipX] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(false);

  const [isMdUp, setIsMdUp] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMdUp("matches" in e ? e.matches : (e as MediaQueryList).matches);
    handler(mql);
    mql.addEventListener?.("change", handler as EventListener);
    return () => mql.removeEventListener?.("change", handler as EventListener);
  }, []);

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
    "bg-app text-card inline-flex items-center gap-2 px-3 md:px-4 py-3 rounded-full pointer-events-auto border border-app shadow-md active:scale-[0.98] hover:shadow-lg hover:brightness-[1.05] transition focus:outline-none focus:ring-2 focus:ring-app/40";

  const assistantBtnClass = [
    btnCommon,
    "relative",
    assistantLocked ? "cursor-not-allowed" : "",
  ].join(" ");

  const bar = (
    <div className="fixed inset-x-0 z-[1000] pointer-events-none" style={{ bottom: pad.bottom }}>
      <div
        className="w-full flex items-center justify-between"
        style={{ paddingLeft: pad.left, paddingRight: pad.right }}
      >
        <div
          className="relative pointer-events-auto"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => {
            setShowTip(false);
            setTipX(null);
          }}
          onMouseMove={(e) => {
            if (!assistantLocked) return;
            const target = e.currentTarget.querySelector("button") as HTMLButtonElement | null;
            if (!target) return;
            const rect = target.getBoundingClientRect();
            setTipX(e.clientX - rect.left);
          }}
        >
          <button
            onClick={assistantLocked ? undefined : onAssistantOpen}
            className={assistantBtnClass}
            aria-label="Open assistant"
            aria-disabled={assistantLocked}
            disabled={assistantLocked}
            title={assistantLocked ? "Assistant is temporarily locked" : "Open assistant"}
          >
            <Bot size={18} aria-hidden />
            <span className="text-sm font-medium hidden md:inline">Assistant</span>

            {assistantLocked && (
              <Lock size={14} className="hidden md:inline-block ml-1 opacity-90" aria-hidden />
            )}

            {assistantLocked && (
              <span
                className="
                  md:hidden
                  absolute -top-0.5 -right-0.5 translate-x-1/2 -translate-y-1/2
                  w-5 h-5 rounded-full bg-card
                  border border-app
                  flex items-center justify-center
                  shadow-sm
                "
                aria-hidden
              >
                <Lock size={11} className="opacity-90" />
              </span>
            )}
          </button>

          {assistantLocked && showTip && tipX !== null && (
            <div
              className="absolute bottom-full mb-2 pointer-events-none transition-opacity duration-150"
              style={{ left: tipX, transform: "translateX(-50%)" }}
            >
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-app text-app shadow whitespace-nowrap">
                Coming soon
              </span>
              <div
                className="mx-auto h-0 w-0 border-x-4 border-x-transparent border-t-4"
                style={{ borderTopColor: "var(--card)" }}
              />
            </div>
          )}
        </div>

        <button
          onClick={onMessagesOpen}
          className={`${btnCommon} pointer-events-auto`}
          aria-label="Open messages"
          title="Open messages"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium hidden md:inline">Messages</span>
        </button>
      </div>
    </div>
  );

  return createPortal(bar, portalTarget ?? document.body);
}