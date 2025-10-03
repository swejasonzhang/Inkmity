import React from "react";
import { X, Bot } from "lucide-react";
import ChatBot from "@/components/dashboard/ChatBot";

type Props = {
    open: boolean;
    onClose: () => void;
};

const AssistantDrawer: React.FC<Props> = ({ open, onClose }) => {
    if (!open) return null;

    return (
        <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-gray-900 border-t border-white/10 shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <Bot size={18} />
                        <span>Assistant</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10"
                        aria-label="Close assistant"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    <ChatBot />
                </div>
            </div>
        </div>
    );
};

export default AssistantDrawer;
