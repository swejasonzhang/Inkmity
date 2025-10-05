import { createPortal } from "react-dom";
import { Bot, MessageSquare } from "lucide-react";

type Props = {
  onAssistantOpen: () => void;
  onMessagesOpen: () => void;
};

export default function FloatingBar({ onAssistantOpen, onMessagesOpen }: Props) {
  const bar = (
    <div className="fixed bottom-4 left-0 right-0 z-[1000] px-8 flex justify-between pointer-events-none">
      <div className="flex w-full justify-between">
        <button
          onClick={onAssistantOpen}
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 rounded-full bg-elevated text-app border border-app shadow-md active:scale-[0.98] ml-0.5 md:ml-0"
          aria-label="Open assistant"
        >
          <Bot size={18} />
          <span className="text-sm font-medium hidden md:inline">Assistant</span>
        </button>

        <button
          onClick={onMessagesOpen}
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 rounded-full bg-elevated text-app border border-app shadow-md active:scale-[0.98] mr-0.5 md:mr-0"
          aria-label="Open messages"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium hidden md:inline">Messages</span>
        </button>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}