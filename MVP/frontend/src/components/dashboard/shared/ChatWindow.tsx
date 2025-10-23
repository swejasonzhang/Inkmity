import type { FC } from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CircularProgress from "@mui/material/CircularProgress";
import { createPortal } from "react-dom";

export interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  participantId: string;
  username: string;
  messages: Message[];
}

interface ChatWindowProps {
  className?: string;
  conversations: Conversation[];
  collapsedMap: Record<string, boolean>;
  currentUserId: string;
  loading: boolean;
  emptyText?: string;
  onToggleCollapse: (participantId: string) => void;
  onRemoveConversation: (participantId: string) => void;
  expandedId?: string | null;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const ChatWindow: FC<ChatWindowProps> = ({
  conversations,
  collapsedMap,
  currentUserId,
  loading,
  emptyText = "No conversations currently.\nPlease click an artist to start one!",
  onToggleCollapse,
  onRemoveConversation,
  expandedId: externalExpandedId,
  authFetch,
}) => {
  const [localConversations, setLocalConversations] = useState<Conversation[]>(conversations);
  const [messageInput, setMessageInput] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => setLocalConversations(conversations), [conversations]);

  useEffect(() => {
    if (externalExpandedId !== undefined) setExpandedId(externalExpandedId ?? null);
  }, [externalExpandedId]);

  useEffect(() => {
    if (localConversations.length > 0 && expandedId == null) {
      const first = localConversations[0].participantId;
      if (collapsedMap[first] === false || collapsedMap[first] === undefined) {
        setExpandedId(first);
      }
    }
  }, [localConversations, expandedId, collapsedMap]);

  useEffect(() => {
    if (!confirmOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmOpen]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 h-full bg-black rounded-3xl">
        <CircularProgress sx={{ color: "#ffffff" }} />
      </div>
    );
  }

  if (!localConversations || localConversations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col justify-center items-center gap-4 overflow-y-auto h-full bg-black p-2 rounded-3xl"
      >
        <p className="text-gray-400 text-center mt-4 whitespace-pre-line">{emptyText}</p>
      </motion.div>
    );
  }

  const handleSend = async (participantId: string, username?: string) => {
    const text = messageInput[participantId]?.trim();
    if (!text) return;

    const optimistic: Message = {
      senderId: currentUserId,
      receiverId: participantId,
      text,
      timestamp: Date.now(),
    };

    setSendError(null);
    setLocalConversations((prev) => {
      const idx = prev.findIndex((c) => c.participantId === participantId);
      if (idx === -1) {
        return [...prev, { participantId, username: username ?? participantId, messages: [optimistic] }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], messages: [...next[idx].messages, optimistic] };
      return next;
    });
    setExpandedId(participantId);
    setMessageInput((prev) => ({ ...prev, [participantId]: "" }));

    try {
      const res = await authFetch("http://localhost:5005/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          receiverId: participantId,
          text,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
    } catch (err: any) {
      setSendError(err?.message || "Failed to send message.");
      setLocalConversations((prev) =>
        prev.map((c) =>
          c.participantId === participantId
            ? {
              ...c,
              messages: c.messages.filter(
                (m) =>
                  !(
                    m.timestamp === optimistic.timestamp &&
                    m.text === optimistic.text &&
                    m.senderId === optimistic.senderId
                  )
              ),
            }
            : c
        )
      );
      setMessageInput((prev) => ({ ...prev, [participantId]: text }));
    }
  };

  const handleToggle = (participantId: string) => {
    const isCurrentlyExpanded = expandedId === participantId;
    setExpandedId(isCurrentlyExpanded ? null : participantId);
    onToggleCollapse(participantId);
    localConversations.forEach((conv) => {
      if (conv.participantId !== participantId && !collapsedMap[conv.participantId]) {
        onToggleCollapse(conv.participantId);
      }
    });
  };

  const requestDelete = (participantId: string) => {
    setPendingDeleteId(participantId);
    setDeleteError(null);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await authFetch("http://localhost:5005/api/messages/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          participantId: pendingDeleteId,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      onRemoveConversation(pendingDeleteId);
      setConfirmOpen(false);
      if (expandedId === pendingDeleteId) setExpandedId(null);
      setPendingDeleteId(null);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete conversation. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
    setDeleteError(null);
  };

  const modal = (
    <AnimatePresence>
      {confirmOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <div className="absolute inset-0 bg-black/80" onClick={cancelDelete} />
          <motion.div
            className="relative bg-gray-900 text-white rounded-xl p-6 w-11/12 max-w-md shadow-xl"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <h3 className="text-lg font-bold mb-2">Delete conversation?</h3>
            <p className="text-gray-300 mb-4">This will permanently remove the conversation for you. Are you sure you want to continue?</p>
            {deleteError && <div className="mb-3 text-sm text-red-400">{deleteError}</div>}
            <div className="flex justify-end gap-3">
              <button onClick={cancelDelete} disabled={deleting} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-60">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-60">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {sendError && <div className="mb-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm">{sendError}</div>}
      <div className="flex flex-col gap-4 overflow-y-auto h-full bg-black p-2 rounded-3xl">
        {localConversations.map((conv) => {
          const isExpanded = expandedId === conv.participantId && !collapsedMap[conv.participantId];
          return (
            <motion.div
              key={conv.participantId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`bg-gray-900 rounded-2xl flex flex-col transition-all duration-300 overflow-hidden ${isExpanded ? "flex-1 min-h-[200px]" : "h-12"
                }`}
            >
              <div className="flex justify-between items-center px-3 pt-2 cursor-pointer" onClick={() => handleToggle(conv.participantId)}>
                <span className="text-white font-extrabold text-lg">{conv.username}</span>
                <div className="flex gap-2">
                  {isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(null);
                        onToggleCollapse(conv.participantId);
                      }}
                      className="text-gray-400 hover:text-gray-200 text-sm"
                    >
                      Hide
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(conv.participantId);
                    }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {isExpanded && <div className="border-t border-gray-700 my-2" />}
              {isExpanded && (
                <div className="flex flex-col flex-1 px-3 pb-3">
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-2 no-scrollbar overscroll-contain">
                    {conv.messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div key={idx} className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={[
                              "bg-black text-white border border-gray-600",
                              "px-3 py-2 rounded-2xl",
                              "max-w-[75%] w-fit",
                              "break-words whitespace-pre-wrap",
                              "shadow-sm",
                            ].join(" ")}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex rounded-xl overflow-hidden">
                    <input
                      type="text"
                      value={messageInput[conv.participantId] || ""}
                      onChange={(e) => setMessageInput((prev) => ({ ...prev, [conv.participantId]: e.target.value }))}
                      className="flex-1 p-2 bg-gray-800 text-white focus:outline-none border-none"
                      placeholder="Type a message..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend(conv.participantId, conv.username);
                      }}
                    />
                    <button onClick={() => handleSend(conv.participantId, conv.username)} className="bg-gray-700 px-4 text-white border-none">
                      Send
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {typeof window !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
};

export default ChatWindow;