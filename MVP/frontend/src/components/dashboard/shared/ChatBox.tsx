import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, MessageSquare, Lock } from "lucide-react";

type FloatingBarProps = {
  onAssistantOpen: () => void;
  onMessagesOpen: () => void;
  portalTarget?: Element | null;
  assistantLocked?: boolean;
};

export function FloatingBar({
  onAssistantOpen,
  onMessagesOpen,
  portalTarget,
  assistantLocked = true,
}: FloatingBarProps) {
  const [tipX, setTipX] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [isMdUp, setIsMdUp] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMdUp("matches" in e ? e.matches : (e as MediaQueryList).matches);
    handler(mql);
    mql.addEventListener?.("change", handler as EventListener);
    return () => mql.removeEventListener?.("change", handler as EventListener);
  }, []);

  const pad = {
    left: isMdUp
      ? "calc(1.85rem + 10px + env(safe-area-inset-left, 0px))"
      : "calc(0.9rem + 8px + env(safe-area-inset-left, 0px))",
    right: isMdUp
      ? "calc(1.85rem + 10px + env(safe-area-inset-right, 0px))"
      : "calc(0.9rem + 8px + env(safe-area-inset-right, 0px))",
    bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
  };

  const btnCommon =
    "bg-app text-card inline-flex items-center gap-2 px-3 md:px-4 py-3 rounded-full pointer-events-auto border border-app shadow-md active:scale-[0.98] hover:shadow-lg hover:brightness-[1.05] transition focus:outline-none focus:ring-2 focus:ring-app/40";

  const assistantBtnClass = [
    btnCommon,
    "relative",
    assistantLocked ? "cursor-not-allowed" : "",
  ].join(" ");

  const bar = (
    <div className="fixed inset-x-0 z-[1000] pointer-events-none" style={{ bottom: pad.bottom }}>
      <div className="w-full flex items-center justify-between" style={{ paddingLeft: pad.left, paddingRight: pad.right }}>
        <div
          className="relative pointer-events-auto"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => {
            setShowTip(false);
            setTipX(null);
          }}
          onMouseMove={(e) => {
            if (!assistantLocked) return;
            const target = e.currentTarget.querySelector("button") as HTMLButtonElement | null;
            if (!target) return;
            const rect = target.getBoundingClientRect();
            setTipX(e.clientX - rect.left);
          }}
        >
          <button
            onClick={assistantLocked ? undefined : onAssistantOpen}
            className={assistantBtnClass}
            aria-label="Open assistant"
            aria-disabled={assistantLocked}
            disabled={assistantLocked}
            title={assistantLocked ? "Assistant is temporarily locked" : "Open assistant"}
          >
            <Bot size={18} aria-hidden />
            <span className="text-sm font-medium hidden md:inline">Assistant</span>
            {assistantLocked && <Lock size={14} className="hidden md:inline-block ml-1 opacity-90" aria-hidden />}
            {assistantLocked && (
              <span
                className="md:hidden absolute -top-0.5 -right-0.5 translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-card border border-app flex items-center justify-center shadow-sm"
                aria-hidden
              >
                <Lock size={11} className="opacity-90" />
              </span>
            )}
          </button>

          {assistantLocked && showTip && tipX !== null && (
            <div
              className="absolute bottom-full mb-2 pointer-events-none transition-opacity duration-150"
              style={{ left: tipX, transform: "translateX(-50%)" }}
            >
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-app text-app shadow whitespace-nowrap">
                Coming soon
              </span>
              <div className="mx-auto h-0 w-0 border-x-4 border-x-transparent border-t-4" style={{ borderTopColor: "var(--card)" }} />
            </div>
          )}
        </div>

        <button
          onClick={onMessagesOpen}
          className={`${btnCommon} pointer-events-auto`}
          aria-label="Open messages"
          title="Open messages"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium hidden md:inline">Messages</span>
        </button>
      </div>
    </div>
  );

  return createPortal(bar, portalTarget ?? document.body);
}

export interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  id?: string;
}

interface ChatBoxProps {
  userId: string;
  userName: string;
  messages?: Message[];
  onSend?: (text: string) => void | Promise<void>;
  onClose?: () => void;
  stackIndex?: number;
  receiverId?: string;
}

export function ChatBox({
  userId,
  userName,
  messages = [],
  onSend,
  onClose,
  stackIndex = 0,
  receiverId,
}: ChatBoxProps) {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [localMessages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;
    setError(null);

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      senderId: userId,
      receiverId: receiverId ?? "unknown",
      text,
      timestamp: Date.now(),
    };

    setSending(true);
    setLocalMessages((prev) => [...prev, optimistic]);
    setNewMessage("");

    try {
      await Promise.resolve(onSend?.(text));
    } catch (e: any) {
      setError(e?.message || "Failed to send.");
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="flex flex-col w-[300px] max-w-full bg-black border border-gray-700 rounded-2xl shadow-lg fixed bottom-4 right-4 z-50"
      style={{ marginBottom: stackIndex * 20 }}
    >
      <div className="p-2 border-b border-gray-700 bg-gray-900 text-white font-bold flex justify-between items-center rounded-t-2xl">
        <span className="text-sm">{userName}</span>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-sm">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="px-2 py-1 text-xs text-red-300 bg-red-900/20 border-t border-b border-red-800">
          {error}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 p-2 overflow-y-auto flex flex-col gap-1"
        style={{ minHeight: 0, maxHeight: "300px" }}
      >
        {localMessages.map((msg, index) => (
          <div key={msg.id ?? index} className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}>
            <span
              className={`px-2 py-1 rounded-lg max-w-[85%] break-words ${msg.senderId === userId ? "bg-gray-600 text-white font-medium italic" : "bg-gray-800 text-gray-300 font-normal"
                }`}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-gray-700 flex gap-2 bg-gray-900 rounded-b-2xl">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border border-gray-600 rounded px-2 py-1 bg-black text-white placeholder-gray-500 focus:outline-none text-sm"
          placeholder="Type a message..."
          disabled={sending}
          aria-disabled={sending}
        />
        <button
          onClick={handleSend}
          className="bg-white text-black px-3 py-1 rounded hover:bg-gray-500 transition text-sm disabled:opacity-60"
          disabled={sending || newMessage.trim().length === 0}
          aria-disabled={sending || newMessage.trim().length === 0}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}