import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";

type Role = "client" | "artist";

type MessagesDrawerProps = {
    open: boolean;
    onClose: () => void;
    currentUserId: string;
    role?: Role;
};

export default function MessagesDrawer({
    open,
    onClose,
    currentUserId,
    role = "client",
}: MessagesDrawerProps) {
    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[1200]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    aria-modal="true"
                    role="dialog"
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        aria-label="Close messages"
                        onClick={onClose}
                    />
                    <motion.aside
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                        className="fixed inset-x-0 bottom-0 bg-card text-app border-t border-app rounded-t-2xl overflow-hidden"
                        style={{ maxHeight: "90dvh", height: "min(90dvh, 720px)" }}
                    >
                        <header className="flex items-center justify-between px-3 py-2 border-b border-app">
                            <div className="font-semibold">Messages</div>
                            <button
                                type="button"
                                className="p-1 rounded-full hover:bg-elevated"
                                onClick={onClose}
                                aria-label="Close"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        <div className="h-full max-h-[calc(100%-42px)]">
                            <div className="h-full overflow-y-auto">
                                <ChatWindow currentUserId={currentUserId} role={role} />
                            </div>
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
