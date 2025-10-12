import { createPortal } from "react-dom";
import { Bot, MessageSquare, Lock } from "lucide-react";
import { useState } from "react";

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

  const btnCommon =
    "bg-card text-app inline-flex items-center gap-2 px-4 py-3 rounded-full pointer-events-auto border border-app shadow-md active:scale-[0.98] hover:shadow-lg transition";

  const assistantBtnClass = `${btnCommon} ${assistantLocked ? "opacity-90 cursor-not-allowed" : ""
    }`;

  const bar = (
    <div
      className="fixed inset-x-0 z-[1000] pointer-events-none"
      style={{ bottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className="w-full flex items-center justify-between"
        style={{
          paddingLeft: "calc(1.85rem + 10px + env(safe-area-inset-left, 0px))",
          paddingRight: "calc(1.85rem + 10px + env(safe-area-inset-right, 0px))",
        }}
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
            <Bot size={18} />
            <span className="text-sm font-medium hidden md:inline">Assistant</span>
            {assistantLocked && <Lock className="h-4 w-4" aria-hidden />}
          </button>

          {assistantLocked && showTip && tipX !== null && (
            <div
              className="absolute bottom-full mb-2 pointer-events-none transition-opacity duration-150"
              style={{
                left: tipX,
                transform: "translateX(-50%)",
              }}
            >
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-app text-app shadow whitespace-nowrap">
                Coming soon
              </span>
              <div className="mx-auto h-0 w-0 border-x-4 border-x-transparent border-t-4"
                style={{ borderTopColor: "var(--card)" }} />
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
