import React, { useEffect, useState } from "react";
import { X, Bot } from "lucide-react";
import ChatBot from "@/components/dashboard/ChatBot";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
    open: boolean;
    onClose: () => void;
};

const AssistantDrawer: React.FC<Props> = ({ open, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);
    const onSafeClose = () => {
        if (isExiting) return;
        setIsExiting(true);
        onClose();
        setTimeout(() => setIsExiting(false), 400);
    };

    useEffect(() => {
        if (!open) return;
        const { overflow, height } = document.body.style;
        document.body.style.overflow = "hidden";
        document.body.style.height = "100vh";
        return () => {
            document.body.style.overflow = overflow;
            document.body.style.height = height;
        };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <div className="lg:hidden fixed inset-0 z-50">
                    {/* overlay */}
                    <motion.div
                        className="absolute inset-0 bg-black/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onSafeClose}
                        aria-hidden
                    />
                    <motion.div
                        className="absolute inset-0 bg-gray-900 flex flex-col"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <Bot size={18} />
                                <span>Assistant</span>
                            </div>
                            <button
                                onClick={onSafeClose}
                                className="p-2 rounded-full hover:bg-white/10 active:scale-[0.98]"
                                aria-label="Close assistant"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <ChatBot />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AssistantDrawer;
