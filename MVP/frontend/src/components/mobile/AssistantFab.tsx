import React from "react";
import { Bot } from "lucide-react";

type Props = { onOpen: () => void; className?: string };

const AssistantFab: React.FC<Props> = ({ onOpen, className }) => (
    <button
        onClick={onOpen}
        aria-label="Open assistant"
        className={`lg:hidden fixed bottom-4 left-4 z-40 h-12 w-12 rounded-full grid place-items-center
                bg-white/15 text-white backdrop-blur border border-white/20 shadow-md
                hover:bg-white/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/40 ${className || ""}`}
    >
        <Bot size={20} />
    </button>
);

export default AssistantFab;
