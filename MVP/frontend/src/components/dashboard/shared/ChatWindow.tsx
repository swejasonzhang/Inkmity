import type { FC } from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { displayNameFromUsername } from "@/lib/format";
import QuickBooking from "../client/QuickBooking";

declare global {
  interface Window {
    cloudinary?: any;
  }
}

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export type Message = {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  meta?: {
    referenceUrls?: string[];
    workRefs?: string[];
    refs?: string[];
    budgetMin?: number;
    budgetMax?: number;
    [k: string]: any;
  };
  delivered?: boolean;
  seen?: boolean;
};

export type Conversation = {
  participantId: string;
  username: string;
  avatarUrl?: string;
  messages: Message[];
  meta?: { lastStatus?: "pending" | "accepted" | "declined" | null; allowed?: boolean };
};

type GateStatus = "pending" | "accepted" | "declined";
type Role = "client" | "artist";

interface ChatWindowProps {
  className?: string;
  conversations: Conversation[];
  collapsedMap: Record<string, boolean>;
  currentUserId: string;
  loading: boolean;
  emptyText?: string;
  onToggleCollapse?: (participantId: string) => void;
  onRemoveConversation: (participantId: string) => void;
  expandedId?: string | null;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  unreadMap?: Record<string, number>;
  onMarkRead?: (participantId: string) => void;
  isArtist?: boolean;
  onAcceptPending?: (participantId: string) => void | Promise<void>;
  onDeclinePending?: (participantId: string) => void | Promise<void>;
  budgetMin?: number | null;
  budgetMax?: number | null;
  role?: Role;
}

const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
const getUrlsFromText = (text: string) => Array.from(new Set((text.match(urlRegex) || [])?.map(u => u.replace(/[),.]+$/, ""))));

const ChatWindow: FC<ChatWindowProps> = ({
  conversations,
  collapsedMap,
  currentUserId,
  loading,
  emptyText = "No conversations currently.\nPlease click an artist to start one!",
  onRemoveConversation,
  expandedId: externalExpandedId,
  authFetch,
  unreadMap = {},
  onMarkRead = () => { },
  isArtist = false,
  onToggleCollapse,
  onAcceptPending,
  onDeclinePending,
  budgetMin = null,
  budgetMax = null,
  role: propRole
}) => {
  const role: Role = propRole ?? (isArtist ? "artist" : "client");
  const isClient = role === "client";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [gateOverride, setGateOverride] = useState<Record<string, GateStatus | undefined>>({});
  const prevExpandedRef = useRef<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [qbOpen, setQbOpen] = useState(false);
  const [qbArtist, setQbArtist] = useState<{ username: string; clerkId: string } | null>(null);

  const openViewer = (url: string) => setViewerUrl(url);
  const closeViewer = () => setViewerUrl(null);

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

  useEffect(() => {
    if (!viewerUrl) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewerUrl]);

  const activeConv = useMemo(() => conversations.find(c => c.participantId === expandedId) || conversations[0], [conversations, expandedId]);

  const fmtTime = (ts: number) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const fetchRequestsAndFindId = async (participantId: string): Promise<string | null> => {
    if (isClient) return null;
    try {
      const res = await authFetch("/api/messages/requests", { method: "GET" });
      if (!res.ok) return null;
      const data = await res.json();
      const list: any[] = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
      const hit = list.find(r => r?.senderId === participantId);
      return hit?._id ? String(hit._id) : hit?.id ? String(hit.id) : null;
    } catch {
      return null;
    }
  };

  const handleAccept = async (participantId: string) => {
    if (isClient) return;
    try {
      const id = await fetchRequestsAndFindId(participantId);
      if (!id) {
        setSendError("No pending request found for this user.");
        return;
      }
      const res = await authFetch(`/api/messages/requests/${id}/accept`, { method: "POST" });
      if (!res.ok) throw new Error(`Accept failed ${res.status}`);
      setGateOverride(m => ({ ...m, [participantId]: "accepted" }));
      await onAcceptPending?.(participantId);
    } catch (e: any) {
      setSendError(e?.message || "Failed to accept request.");
    }
  };

  const handleDecline = async (participantId: string) => {
    if (isClient) return;
    try {
      const id = await fetchRequestsAndFindId(participantId);
      if (!id) {
        setSendError("No pending request found for this user.");
        return;
      }
      const res = await authFetch(`/api/messages/requests/${id}/decline`, { method: "POST" });
      if (!res.ok) throw new Error(`Decline failed ${res.status}`);
      setGateOverride(m => ({ ...m, [participantId]: "declined" }));
      await onDeclinePending?.(participantId);
    } catch (e: any) {
      setSendError(e?.message || "Failed to decline request.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-card rounded-2xl">
        <CircularProgress sx={{ color: "var(--fg)" }} />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-card rounded-2xl p-4">
        <p className="text-muted-foreground text-center whitespace-pre-line">{emptyText}</p>
      </div>
    );
  }

  const handleSend = async (participantId: string) => {
    const text = messageInput[participantId]?.trim();
    if (!text) return;
    setSendError(null);
    setExpandedId(participantId);
    setMessageInput(prev => ({ ...prev, [participantId]: "" }));
    try {
      const meta: Record<string, any> = {};
      if (budgetMin != null) meta.budgetMin = budgetMin;
      if (budgetMax != null) meta.budgetMax = budgetMax;
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ receiverId: participantId, text, meta })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      onMarkRead(participantId);
    } catch (err: any) {
      setSendError(err?.message || "Failed to send message.");
      setMessageInput(prev => ({ ...prev, [participantId]: text }));
    }
  };

  const requestDelete = (participantId: string) => {
    prevExpandedRef.current = expandedId;
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
        body: JSON.stringify({ userId: currentUserId, participantId: pendingDeleteId })
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
    if (prevExpandedRef.current) setExpandedId(prevExpandedRef.current);
  };

  const avatarFor = (c: Conversation) => {
    const name = displayNameFromUsername(c.username || "");
    const initials = name.split(" ").filter(Boolean).slice(0, 2).map(ch => ch[0]?.toUpperCase()).join("");
    return (
      <span className="h-7 w-7 rounded-full grid place-items-center bg-elevated text-app text-[10px] font-semibold border border-app">
        {initials || "?"}
      </span>
    );
  };

  const modal = (
    <AnimatePresence>
      {confirmOpen && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          onClick={cancelDelete}
        >
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close dialog" />
          <motion.div
            className="relative bg-card text-app rounded-xl p-6 w-11/12 max-w-md shadow-2xl border border-app"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-2">Delete conversation?</h3>
            <p className="text-muted-foreground mb-4 text-sm">This removes the conversation for you.</p>
            {deleteError && <div className="mb-3 text-sm text-destructive">{deleteError}</div>}
            <div className="flex justify-end gap-3">
              <button
                onClick={e => {
                  e.stopPropagation();
                  cancelDelete();
                }}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-elevated hover:bg-elevated/80 text-app text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  confirmDelete();
                }}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const imageViewer = (
    <AnimatePresence>
      {viewerUrl && (
        <motion.div
          className="fixed inset-0 z-[99998] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          tabIndex={-1}
        >
          <button type="button" className="absolute inset-0 bg-black/80" aria-label="Close image" onClick={closeViewer} />
          <button
            type="button"
            onClick={closeViewer}
            aria-label="Close"
            className="fixed top-6 right-6 h-10 w-10 rounded-full grid place-items-center border border-app bg-elevated text-app hover:bg-elevated/80"
            title="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
          <div className="relative">
            <img
              key={viewerUrl}
              src={viewerUrl}
              alt="preview"
              width={1000}
              height={1000}
              className="object-cover"
              style={{ width: "1000px", height: "1000px" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const rawStatus = activeConv?.meta?.lastStatus ?? null;
  const override = gateOverride[activeConv?.participantId || ""];
  const computedStatus: GateStatus | null = useMemo(() => {
    const v = override ?? rawStatus;
    return v === "pending" || v === "accepted" || v === "declined" ? v : null;
  }, [override, rawStatus]);

  const status: GateStatus | null = isClient ? null : computedStatus;
  const canSend = isClient ? true : status === "accepted" && (override === "accepted" || !!activeConv?.meta?.allowed);
  const needsApproval = isClient ? false : status === "pending" && !canSend;

  const lastOutgoingIndex = useMemo(() => {
    if (!activeConv?.messages?.length) return -1;
    for (let i = activeConv.messages.length - 1; i >= 0; i--) {
      if (activeConv.messages[i].senderId === currentUserId) return i;
    }
    return -1;
  }, [activeConv?.messages, currentUserId]);

  const statusLabelFor = (m?: Message): string | null => {
    if (!m) return null;
    if (m.seen) return "Seen";
    if (m.delivered) return "Delivered";
    return null;
  };

  const openUpload = () => {
    if (!activeConv) return;
    if (!window.cloudinary || !CLOUD_NAME || !UPLOAD_PRESET) {
      console.error("Cloudinary widget not available or envs missing");
      return;
    }
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        multiple: true,
        sources: ["local", "camera", "url"],
        resourceType: "image",
        maxFiles: 8
      },
      (err: any, result: any) => {
        if (err) return;
        if (result?.event === "success") {
          const url = result.info?.secure_url || result.info?.url;
          const id = activeConv!.participantId;
          setMessageInput(prev => {
            const prevVal = prev[id] || "";
            const sep = prevVal ? "\n" : "";
            return { ...prev, [id]: `${prevVal}${sep}${url}` };
          });
        }
      }
    );
    widget.open();
  };

  const openBooking = () => {
    if (!activeConv) return;
    setQbArtist({ username: activeConv.username, clerkId: activeConv.participantId });
    setQbOpen(true);
  };

  return (
    <>
      <div className="h-full w-full grid grid-cols-[200px_minmax(0,1fr)] gap-3 bg-card rounded-2xl p-3">
        <aside className="h-full overflow-y-auto rounded-xl border border-app bg-card">
          <ul className="divide-y divide-app/60">
            {conversations.map(c => {
              const isActive = c.participantId === activeConv?.participantId;
              const lastMsg = c.messages[c.messages.length - 1];
              return (
                <li key={c.participantId}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (expandedId !== c.participantId) setExpandedId(c.participantId);
                      if (onToggleCollapse && collapsedMap[c.participantId]) onToggleCollapse(c.participantId);
                      onMarkRead(c.participantId);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (expandedId !== c.participantId) setExpandedId(c.participantId);
                        if (onToggleCollapse && collapsedMap[c.participantId]) onToggleCollapse(c.participantId);
                        onMarkRead(c.participantId);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left ${isActive ? "bg-elevated/60" : "hover:bg-elevated/40"}`}
                  >
                    {avatarFor(c)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-app truncate">{displayNameFromUsername(c.username)}</div>
                        <div className="text-[13px] shrink-0">{lastMsg ? fmtTime(lastMsg.timestamp) : ""}</div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{lastMsg?.text || "No messages"}</div>
                    </div>
                    {!!unreadMap[c.participantId] && (
                      <span className="ml-2 shrink-0 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-semibold">
                        {unreadMap[c.participantId]}
                      </span>
                    )}
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted-foreground hover:text-app"
                      onClick={e => {
                        e.stopPropagation();
                        requestDelete(c.participantId);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="h-full rounded-xl border border-app bg-card flex flex-col">
          <header className="px-4 py-3 border-b border-app flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 pointer-events-auto">
              {activeConv && avatarFor(activeConv)}
              <div className="text-sm font-semibold text-app">
                {activeConv ? displayNameFromUsername(activeConv.username) : "Conversation"}
              </div>
              {budgetMin != null || budgetMax != null ? (
                <div className="ml-2 text-xs px-2 py-0.5 rounded-full border border-app bg-elevated text-app">
                  Budget: {budgetMin != null ? `$${budgetMin}` : "—"}{budgetMax != null ? `–$${budgetMax}` : ""}
                </div>
              ) : null}
              {needsApproval && !isClient && !isArtist && (
                <div className="text-xs text-muted-foreground">Waiting for artist to approve your request.</div>
              )}
              {!needsApproval && status === "declined" && !isClient && (
                <div className="text-xs text-muted-foreground">Declined. Messaging locked unless a new request is accepted.</div>
              )}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={openBooking}
                title="Open booking"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-primary/90 bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:shadow transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              >
                Ready to Book?
              </button>

              {role === "artist" && needsApproval && activeConv && (
                <>
                  <button
                    type="button"
                    onClick={() => handleDecline(activeConv.participantId)}
                    className="px-2 py-1 rounded-md bg-elevated hover:bg-elevated/80 text-app text-xs"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccept(activeConv.participantId)}
                    className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs"
                  >
                    Accept
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {(!activeConv?.messages || activeConv.messages.length === 0) && needsApproval ? (
              <div className="text-sm text-muted-foreground">No messages yet. Approval required.</div>
            ) : (
              activeConv?.messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUserId;
                const fromMetaRef = ([] as string[])
                  .concat(msg.meta?.referenceUrls ?? [])
                  .concat(msg.meta?.workRefs ?? [])
                  .concat(msg.meta?.refs ?? []);
                const fromText = getUrlsFromText(msg.text);
                const merged = Array.from(new Set([...fromMetaRef, ...fromText])).slice(0, 3);
                const isLastOutgoing = isMe && idx === lastOutgoingIndex;
                const readableStatus = isLastOutgoing ? statusLabelFor(msg) : null;
                const cols = merged.length >= 3 ? "grid-cols-3" : merged.length === 2 ? "grid-cols-2" : "grid-cols-1";
                const bMin = (msg.meta?.budgetMin as number | undefined) ?? (msg.meta?.budget?.min as number | undefined);
                const bMax = (msg.meta?.budgetMax as number | undefined) ?? (msg.meta?.budget?.max as number | undefined);

                return (
                  <div key={idx} className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[78%] w-fit break-words whitespace-pre-wrap border ${isMe ? "bg-primary text-primary-foreground border-primary/80" : "bg-elevated text-app border-app"}`}
                    >
                      <div>{msg.text}</div>
                      {bMin != null || bMax != null ? (
                        <div className={`mt-1 text-[11px] ${isMe ? "text-primary-foreground/90" : "text-app/80"}`}>
                          Budget: {bMin != null ? `$${bMin}` : "—"}{bMax != null ? `–$${bMax}` : ""}
                        </div>
                      ) : null}
                      {!!merged.length && (
                        <div className={`mt-2 grid ${cols} gap-2`}>
                          {merged.map(u => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => openViewer(u)}
                              className="w-full rounded-lg border border-app/60 overflow-hidden"
                              title="Open"
                            >
                              <img
                                src={u}
                                alt="reference"
                                className="w-full h-56 object-cover bg-black/5"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className={`mt-1 text-[13px] ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {readableStatus ? `${fmtTime(msg.timestamp)} · ${readableStatus}` : fmtTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {sendError && <div className="px-4 pb-2 text-sm text-destructive">{sendError}</div>}

          <footer className="p-3 border-t border-app">
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={openUpload}
                className="px-3 rounded-xl border border-app bg-elevated hover:bg-elevated/80 text-app text-sm"
                aria-label="Add images"
                title="Add images"
                disabled={needsApproval && !isClient}
              >
                + Image
              </button>
              <div className="flex-1 flex rounded-xl overflow-hidden border border-app bg-card">
                <input
                  type="text"
                  value={activeConv ? messageInput[activeConv.participantId] || "" : ""}
                  onChange={e => activeConv && setMessageInput(prev => ({ ...prev, [activeConv.participantId]: e.target.value }))}
                  className="flex-1 p-2.5 bg-transparent text-app placeholder:text-muted-foreground focus:outline-none"
                  placeholder={
                    needsApproval && !isClient
                      ? isArtist
                        ? "Approve to enable messaging"
                        : "Waiting for approval"
                      : status === "declined" && !isClient
                        ? "Messaging locked"
                        : "Type a message"
                  }
                  disabled={needsApproval && !isClient}
                  onKeyDown={e => {
                    if (needsApproval && !isClient) return;
                    if (e.key === "Enter" && activeConv) handleSend(activeConv.participantId);
                  }}
                />
                <button
                  type="button"
                  onClick={() => activeConv && (!needsApproval || isClient) && handleSend(activeConv.participantId)}
                  disabled={needsApproval && !isClient}
                  className="px-4 text-sm font-medium bg-elevated hover:bg-elevated/80 text-app disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </footer>
        </section>
      </div>
      {typeof window !== "undefined" ? createPortal(modal, document.body) : null}
      {typeof window !== "undefined" ? createPortal(imageViewer, document.body) : null}
      <QuickBooking
        open={qbOpen}
        artist={qbArtist ? ({ username: qbArtist.username, clerkId: qbArtist.clerkId } as any) : undefined}
        onClose={() => setQbOpen(false)}
      />
    </>
  );
};

export default ChatWindow;