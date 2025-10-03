import React from "react";
import { MessageSquare } from "lucide-react";

type Props = { onOpen: () => void; className?: string };

const MessagesFab: React.FC<Props> = ({ onOpen, className }) => (
    <button
        onClick={onOpen}
        className={`lg:hidden fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white/15 text-white backdrop-blur border border-white/20 shadow-md active:scale-[0.98] ${className || ""}`}
        aria-label="Open messages"
    >
        <MessageSquare size={18} />
        <span className="text-sm font-medium">Messages</span>
    </button>
);

export default MessagesFab;
