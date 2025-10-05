import React from "react";
import { MessageSquare } from "lucide-react";

type Props = { onOpen: () => void; className?: string };

const MessagesFab: React.FC<Props> = ({ onOpen, className }) => (
    <button
        onClick={onOpen}
        aria-label="Open messages"
        className={`lg:hidden fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full grid place-items-center
                bg-white/15 text-white backdrop-blur border border-white/20 shadow-md
                hover:bg-white/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/40 ${className || ""}`}
    >
        <MessageSquare size={20} />
    </button>
);

export default MessagesFab;
