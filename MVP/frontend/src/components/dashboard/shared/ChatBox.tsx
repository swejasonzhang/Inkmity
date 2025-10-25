import { X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import MessagesPanel from "@/components/dashboard/shared/messages/MessagesPanel";

type ChatBoxProps = {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
};

export default function ChatBox({ open, onClose, currentUserId }: ChatBoxProps) {
  const panelVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: 680, opacity: 1 },
    exit: { height: 0, opacity: 0 },
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            key="messages"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={panelVariants}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="pointer-events-auto fixed right-4 bottom-4 overflow-hidden"
            style={{ width: "min(96vw, 720px)" }}
          >
            <Card className="h-full bg-card border border-app shadow-2xl rounded-2xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquare size={18} />
                  <span>Messages</span>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-elevated" aria-label="Close messages">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MessagesPanel currentUserId={currentUserId} expandAllOnMount />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}