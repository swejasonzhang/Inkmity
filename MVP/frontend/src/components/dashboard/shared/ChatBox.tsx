import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { X, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import ChatWindow from "./ChatWindow";

type ChatBoxProps = {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  isArtist?: boolean;
};

export default function ChatBox({ open, onClose, currentUserId, isArtist = false }: ChatBoxProps) {
  const PANEL_W = 320;
  const CHAT_W = 720;
  const { themeClass } = useTheme();
  const dims = useMemo(() => {
    const width = isArtist ? CHAT_W + PANEL_W : CHAT_W;
    return { width };
  }, [isArtist]);
  const panelVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 }
  };
  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${themeClass}`}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="messages"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={panelVariants}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="pointer-events-auto fixed inset-y-0 right-2 md:right-4"
            style={{ width: `${dims.width}px` }}
          >
            <Card
              className="bg-background text-app border border-app shadow-2xl rounded-2xl flex h-full"
              style={{ width: `${dims.width}px` }}
            >
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-app">
                  <div className="flex items-center gap-2 font-semibold">
                    <MessageSquare size={18} />
                    <span>Messages</span>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-elevated" aria-label="Close messages">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden bg-card">
                  <ChatWindow currentUserId={currentUserId} isArtist={isArtist} />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}