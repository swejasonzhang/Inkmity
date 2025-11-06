import type { FC } from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { displayNameFromUsername } from "@/lib/format";
import QuickBooking from "../client/QuickBooking";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RequestPanel from "./messages/RequestPanel";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";

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
  currentUserId: string;
  isArtist?: boolean;
  role?: Role;
  onRemoveConversation?: (participantId: string) => void;
}

const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
const getUrlsFromText = (text: string) =>
  Array.from(new Set((text.match(urlRegex) || [])?.map(u => u.replace(/[),.]+$/, ""))));

const PANEL_W = 320;

const ChatWindow: FC<ChatWindowProps> = ({
  currentUserId,
  isArtist = false,
  role: propRole,
  onRemoveConversation
}) => {
  const role: Role = propRole ?? (isArtist ? "artist" : "client");
  const isClient = role === "client";

  const { getToken } = useAuth();
  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getToken();
      const base = API_URL.replace(/\/$/, "");
      const cleaned = path.replace(/^\/api/, "");
      const url = path.startsWith("http") ? path : `${base}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
      const headers = new Headers(init.headers || {});
      headers.set("Accept", "application/json");
      headers.set("Content-Type", "application/json");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(url, { ...init, headers, credentials: "include" });
    },
    [getToken]
  );

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
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

  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/messages/user/${currentUserId}`, { method: "GET" });
        const data = res.ok ? await res.json() : null;
        const arr: Conversation[] = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : [];
        if (mounted) setConversations(arr);
        if (mounted) {
          const next: Record<string, number> = {};
          for (const c of arr) next[c.participantId] = next[c.participantId] ?? 0;
          setUnreadMap(m => ({ ...next, ...m }));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authFetch, currentUserId]);

  useEffect(() => {
    if (conversations.length > 0 && expandedId == null) {
      const first = conversations[0].participantId;
      if (collapsedMap[first] === false || collapsedMap[first] === undefined) {
        setExpandedId(first);
      }
    }
  }, [conversations, expandedId, collapsedMap]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | { id?: string; clerkId?: string }>).detail;
      const id = typeof detail === "string" ? detail : detail?.id || detail?.clerkId || null;
      if (id) setExpandedId(id);
    };
    window.addEventListener("ink:set-expanded-conversation", handler as EventListener);
    return () => window.removeEventListener("ink:set-expanded-conversation", handler as EventListener);
  }, []);

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

  const activeConv = useMemo(
    () => conversations.find(c => c.participantId === expandedId) || conversations[0],
    [conversations, expandedId]
  );

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

  const onToggleCollapse = (participantId: string) =>
    setCollapsedMap(m => ({ ...m, [participantId]: !m[participantId] }));

  const onMarkRead = useCallback((participantId: string) => {
    setUnreadMap(m => (m[participantId] ? { ...m, [participantId]: 0 } : m));
  }, []);

  const fetchRequestsAndFindId = async (participantId: string): Promise<string | null> => {
    if (isClient) return null;
    try {
      const res = await authFetch("/api/messages/requests", { method: "GET" });
      const data = res.ok ? await res.json() : null;
      const list: any[] = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
      const hit = list.find((r: any) => r?.senderId === participantId);
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
      setConversations(list =>
        list.map(c =>
          c.participantId === participantId ? { ...c, meta: { ...(c.meta || {}), lastStatus: "accepted", allowed: true } } : c
        )
      );
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
      setConversations(list =>
        list.map(c =>
          c.participantId === participantId ? { ...c, meta: { ...(c.meta || {}), lastStatus: "declined", allowed: false } } : c
        )
      );
    } catch (e: any) {
      setSendError(e?.message || "Failed to decline request.");
    }
  };

  const removeConversation = useCallback((participantId: string) => {
    setConversations(list => list.filter(c => c.participantId !== participantId));
    onRemoveConversation?.(participantId);
  }, [onRemoveConversation]);

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

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-full bg-card rounded-2xl">
        <CircularProgress sx={{ color: "var(--fg)" }} />
      </div>
    );
  }

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
        <p className="text-muted-foreground text-center whitespace-pre-line">
          No conversations currently.
          {"\n"}Please click an artist to start one.
        </p>
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
      removeConversation(pendingDeleteId);
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
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(ch => ch[0]?.toUpperCase())
      .join("");
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
          className="fixed inset-0 z-[99998] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <button type="button" className="absolute inset-0 bg-black/80" aria-label="Close image" onClick={() => setViewerUrl(null)} />
          <button
            type="button"
            onClick={() => setViewerUrl(null)}
            aria-label="Close"
            className="fixed top-6 right-6 h-10 w-10 rounded-full grid place-items-center border border-app bg-elevated text-app hover:bg-elevated/80"
          >
            <span className="text-xl leading-none">×</span>
          </button>
          <div className="relative pointer-events-none">
            <img
              key={viewerUrl || ""}
              src={viewerUrl || ""}
              alt="preview"
              className="block object-contain"
              style={{ width: "100%", height: "100%" }}
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const openUpload = () => {
    if (!activeConv) return;
    if (!window.cloudinary || !CLOUD_NAME || !UPLOAD_PRESET) return;
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
      <div className="h-full w-full min-h-0 flex flex-col">
        <div className="w-full flex-1 min-h-0 bg-card rounded-2xl p-3 flex gap-3">
          {isArtist && (
            <aside
              className="hidden md:flex flex-col border border-app bg-card h-full shrink-0 rounded-xl min-h-0"
              style={{ width: PANEL_W }}
            >
              <div className="px-3 py-3 border-b border-app">
                <div className="text-sm font-semibold">Message requests</div>
                <div className="text-xs text-muted-foreground">Review new requests</div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <RequestPanel
                  authFetch={authFetch}
                  onOpenConversation={(clerkId) => {
                    setExpandedId(clerkId);
                    try {
                      window.dispatchEvent(new CustomEvent("ink:set-expanded-conversation", { detail: clerkId }));
                    } catch { }
                  }}
                />
              </div>
            </aside>
          )}
          <div className="flex-1 min-w-0 flex min-h-0">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] h-full min-h-0 flex-1">
              <aside className="hidden md:block h-full rounded-xl border border-app bg-card min-h-0 overflow-y-auto">
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
                            if (collapsedMap[c.participantId]) onToggleCollapse(c.participantId);
                            onMarkRead(c.participantId);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === " ") {
                              if (expandedId !== c.participantId) setExpandedId(c.participantId);
                              if (collapsedMap[c.participantId]) onToggleCollapse(c.participantId);
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
              <section className="h-full rounded-xl border border-app bg-card flex flex-col min-h-0">
                <header className="px-3 md:px-4 py-3 border-b border-app flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="md:hidden min-w-[200px] max-w-[60vw]">
                      <Select
                        value={activeConv?.participantId}
                        onValueChange={(val) => {
                          setExpandedId(val);
                          onMarkRead(val);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select conversation" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[50vh]">
                          {conversations.map(c => (
                            <SelectItem key={c.participantId} value={c.participantId}>
                              {displayNameFromUsername(c.username)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      {activeConv && avatarFor(activeConv)}
                      <div className="text-sm font-semibold text-app truncate">
                        {activeConv ? displayNameFromUsername(activeConv.username) : "Conversation"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isClient && (
                      <button
                        type="button"
                        onClick={openBooking}
                        title="Open booking"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-primary/90 bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                      >
                        Ready to Book?
                      </button>
                    )}
                    {role === "artist" && activeConv && (() => {
                      const raw = activeConv?.meta?.lastStatus ?? null;
                      const ov = gateOverride[activeConv?.participantId || ""];
                      const v = (ov ?? raw) as GateStatus | null;
                      const needs = v === "pending" && !(ov === "accepted" || !!activeConv?.meta?.allowed);
                      if (!needs) return null;
                      return (
                        <div className="flex items-center gap-2">
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
                        </div>
                      );
                    })()}
                  </div>
                </header>
                <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 flex flex-col gap-3 overscroll-contain min-h-0">
                  {(!activeConv?.messages || activeConv.messages.length === 0) && !isClient && (activeConv?.meta?.lastStatus === "pending") ? (
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
                      const readableStatus = isLastOutgoing ? (msg.seen ? "Seen" : msg.delivered ? "Delivered" : null) : null;

                      return (
                        <div key={idx} className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`px-3 py-4 rounded-2xl max-w-[80%] sm:max-w-[66%] md:max-w-[50%] w-fit break-words whitespace-pre-wrap border leading-loose text-[15px] ${isMe ? "bg-primary text-primary-foreground border-primary/80" : "bg-elevated text-app border-app"}`}
                          >
                            <div>{msg.text}</div>
                            {!!merged.length && (
                              <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                {merged.map(u => (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => setViewerUrl(u)}
                                    className="w-full rounded-lg border border-app/60 overflow-hidden"
                                    title="Open"
                                  >
                                    <img
                                      src={u}
                                      alt="reference"
                                      className="w-full aspect-[4/3] object-cover bg-black/5"
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
                <footer className="p-2.5 md:p-3 border-t border-app">
                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={openUpload}
                      className="px-3 h-15 md:h-17 rounded-xl border border-app bg-elevated hover:bg-elevated/80 text-app text-sm"
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
                        onChange={e =>
                          activeConv && setMessageInput(prev => ({ ...prev, [activeConv.participantId]: e.target.value }))
                        }
                        className="flex-1 p-3 md:p-3 bg-transparent text-app placeholder:text-muted-foreground focus:outline-none"
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
                        className="px-4 h-10 md:h-10 text-sm font-medium bg-elevated hover:bg-elevated/80 text-app disabled:opacity-60"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </footer>
              </section>
              <aside className="md:hidden rounded-xl border border-app bg-card overflow-x-auto">
                <ul className="flex gap-2 p-2">
                  {conversations.map(c => {
                    const isActive = c.participantId === activeConv?.participantId;
                    return (
                      <li key={c.participantId}>
                        <button
                          onClick={() => {
                            if (expandedId !== c.participantId) setExpandedId(c.participantId);
                            onMarkRead(c.participantId);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isActive ? "bg-elevated/60" : "hover:bg-elevated/40"} border-app`}
                        >
                          {avatarFor(c)}
                          <span className="text-xs">{displayNameFromUsername(c.username)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>
            </div>
          </div>
        </div>
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