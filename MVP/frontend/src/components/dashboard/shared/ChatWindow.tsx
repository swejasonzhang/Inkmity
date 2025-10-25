import type { FC } from "react";
import { useState, useEffect, useMemo } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { displayNameFromUsername } from "@/lib/format";
import type { Conversation } from "@/hooks/useMessaging";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (externalExpandedId !== undefined) setExpandedId(externalExpandedId ?? null);
  }, [externalExpandedId]);

  useEffect(() => {
    if (conversations.length > 0 && expandedId == null) {
      const first = conversations[0].participantId;
      if (collapsedMap[first] === false || collapsedMap[first] === undefined) {
        setExpandedId(first);
      }
    }
  }, [conversations, expandedId, collapsedMap]);

  useEffect(() => {
    if (!confirmOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmOpen]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.participantId === expandedId) || conversations[0],
    [conversations, expandedId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1f2937] rounded-2xl">
        <CircularProgress sx={{ color: "#ffffff" }} />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1f2937] rounded-2xl p-4">
        <p className="text-subtle text-center whitespace-pre-line">{emptyText}</p>
      </div>
    );
  }

  const handleSend = async (participantId: string) => {
    const text = messageInput[participantId]?.trim();
    if (!text) return;
    setSendError(null);
    setExpandedId(participantId);
    setMessageInput((prev) => ({ ...prev, [participantId]: "" }));
    try {
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ receiverId: participantId, text }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
    } catch (err: any) {
      setSendError(err?.message || "Failed to send message.");
      setMessageInput((prev) => ({ ...prev, [participantId]: text }));
    }
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
      const res = await authFetch("/api/messages/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ userId: currentUserId, participantId: pendingDeleteId }),
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

  const avatarFor = (c: Conversation) => {
    const name = displayNameFromUsername(c.username || "");
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
    return (
      <span className="h-7 w-7 rounded-full grid place-items-center bg-black/50 text-white text-[10px] font-semibold border border-white/15">
        {initials || "?"}
      </span>
    );
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
          <div className="absolute inset-0 bg-black/70" onClick={cancelDelete} />
          <motion.div
            className="relative bg-[#1f2937] text-white rounded-xl p-6 w-11/12 max-w-md shadow-2xl border border-white/10"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
          >
            <h3 className="text-base font-semibold mb-2">Delete conversation?</h3>
            <p className="text-subtle mb-4 text-sm">This removes the conversation for you.</p>
            {deleteError && <div className="mb-3 text-sm text-red-400">{deleteError}</div>}
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const status = activeConv?.meta?.lastStatus || null;
  const canSend = !!activeConv?.meta?.allowed;

  return (
    <>
      <div className="h-full w-full grid grid-cols-[200px_minmax(0,1fr)] gap-3 bg-[#1f2937] rounded-2xl p-3">
        <aside className="h-full overflow-y-auto rounded-xl border border-white/10 bg-[#1f2937]">
          <ul className="divide-y divide-white/10">
            {conversations.map((c) => {
              const isActive = c.participantId === activeConv?.participantId;
              return (
                <li key={c.participantId}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (expandedId !== c.participantId) setExpandedId(c.participantId);
                      if (collapsedMap[c.participantId]) onToggleCollapse(c.participantId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (expandedId !== c.participantId) setExpandedId(c.participantId);
                        if (collapsedMap[c.participantId]) onToggleCollapse(c.participantId);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left outline-none ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    {avatarFor(c)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{displayNameFromUsername(c.username)}</div>
                      <div className="text-xs text-subtle truncate">
                        {c.messages[c.messages.length - 1]?.text || "No messages"}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDelete(c.participantId);
                        }}
                        className="text-xs text-white/70 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="h-full rounded-xl border border-white/10 bg-[#1f2937] flex flex-col">
          <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeConv && avatarFor(activeConv)}
              <div>
                <div className="text-sm font-semibold text-white">
                  {activeConv ? displayNameFromUsername(activeConv.username) : "Conversation"}
                </div>
                {status === "pending" && (
                  <div className="text-xs text-white/70">Request sent. Waiting for acceptance.</div>
                )}
                {status === "declined" && (
                  <div className="text-xs text-white/70">Declined. You cannot message unless a new request is accepted.</div>
                )}
              </div>
            </div>
            <div className="text-xs text-white/60">
              {activeConv?.messages?.length || 0} message{(activeConv?.messages?.length || 0) === 1 ? "" : "s"}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {(!activeConv?.messages || activeConv.messages.length === 0) && (!canSend || status !== "accepted") ? (
              <div className="text-sm text-subtle">No messages yet. Waiting for acceptance.</div>
            ) : (
              activeConv?.messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={idx} className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[78%] w-fit break-words whitespace-pre-wrap border ${isMe ? "bg-white text-black border-white/80" : "bg-black/40 text-white border-white/15"
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {sendError && <div className="px-4 pb-2 text-sm text-red-400">{sendError}</div>}

          <footer className="p-3 border-t border-white/10">
            <div className="flex rounded-xl overflow-hidden border border-white/10 bg-[#1f2937]">
              <input
                type="text"
                value={activeConv ? messageInput[activeConv.participantId] || "" : ""}
                onChange={(e) =>
                  activeConv &&
                  setMessageInput((prev) => ({ ...prev, [activeConv.participantId]: e.target.value }))
                }
                className="flex-1 p-2.5 bg-transparent text-white placeholder-white/50 focus:outline-none"
                placeholder={canSend ? "Type a message" : "Messaging locked until accepted"}
                disabled={!canSend}
                onKeyDown={(e) => {
                  if (!canSend) return;
                  if (e.key === "Enter" && activeConv) handleSend(activeConv.participantId);
                }}
              />
              <button
                type="button"
                onClick={() => activeConv && canSend && handleSend(activeConv.participantId)}
                disabled={!canSend}
                className="px-4 text-sm font-medium bg-white/10 hover:bg-white/15 text-white disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </footer>
        </section>
      </div>
      {typeof window !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
};

export default ChatWindow;