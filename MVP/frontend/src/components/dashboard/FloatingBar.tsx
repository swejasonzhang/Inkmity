import { createPortal } from "react-dom";
import { Bot, MessageSquare } from "lucide-react";

type Props = {
  onAssistantOpen: () => void;
  onMessagesOpen: () => void;
  portalTarget?: Element | null;
};

export default function FloatingBar({ onAssistantOpen, onMessagesOpen, portalTarget }: Props) {
  const btnCommon =
    "bg-card text-app inline-flex items-center gap-2 px-4 py-3 rounded-full pointer-events-auto border border-app shadow-md active:scale-[0.98] hover:shadow-lg transition";

  const bar = (
    <div
      className="fixed inset-x-0 z-[1000] pointer-events-none"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className="w-full flex items-center justify-between"
        style={{
          paddingLeft: "calc(1.85rem + env(safe-area-inset-left, 0px))",
          paddingRight: "calc(1.85rem + env(safe-area-inset-right, 0px))",
        }}
      >
        <button
          onClick={onAssistantOpen}
          className={btnCommon}
          aria-label="Open assistant"
        >
          <Bot size={18} />
          <span className="text-sm font-medium hidden md:inline">Assistant</span>
        </button>

        <button
          onClick={onMessagesOpen}
          className={btnCommon}
          aria-label="Open messages"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium hidden md:inline">Messages</span>
        </button>
      </div>
    </div>
  );

  return createPortal(bar, portalTarget ?? document.body);
}