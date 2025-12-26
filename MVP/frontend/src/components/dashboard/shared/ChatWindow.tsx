import type { FC } from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Send, Image as ImageIcon, X, Calendar, MessageSquare } from "lucide-react";
import { displayNameFromUsername } from "@/lib/format";
import QuickBooking from "../client/QuickBooking";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RequestPanel from "./messages/requestPanel";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { socket } from "@/lib/socket";
import { getSignedUpload, uploadToCloudinary } from "@/lib/cloudinary";
import { enableClientBookings, checkConsultationStatus, getArtistPolicy, type ArtistPolicy } from "@/api";
import DepositPolicyModal from "./DepositPolicyModal";
import "@/styles/ink-conversations.css";

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
    createdAt?: string | number;
    [k: string]: any;
  };
  delivered?: boolean;
  seen?: boolean;
  deliveredAt?: number | string;
  seenAt?: number | string;
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
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [requestCount, setRequestCount] = useState(0);

  const appRef = useRef<HTMLDivElement | null>(null);
  const overlayActive = confirmOpen || !!viewerUrl;

  useEffect(() => {
    const el = appRef.current as any;
    if (!el) return;
    if (overlayActive) {
      el.setAttribute("aria-hidden", "true");
      el.inert = true;
    } else {
      el.removeAttribute("aria-hidden");
      try {
        el.inert = false;
      } catch { }
    }
  }, [overlayActive]);

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
    if (!isArtist || isClient) return;
    let mounted = true;
    (async () => {
      try {
        const res = await authFetch("/api/messages/requests", { method: "GET" });
        const data = res.ok ? await res.json() : null;
        const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
        if (mounted) setRequestCount(list.length);
      } catch {
        if (mounted) setRequestCount(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authFetch, isArtist, isClient]);

  useEffect(() => {
    if (!currentUserId) return;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("register", currentUserId);
    return () => {
      socket.emit("unregister");
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!expandedId || !currentUserId) return;
    const threadKey = [currentUserId, expandedId].sort().join(":");
    socket.emit("thread:join", { threadKey });
    return () => {
      socket.emit("thread:leave", { threadKey });
    };
  }, [expandedId, currentUserId]);

  useEffect(() => {
    const onAck = (p: {
      convoId: string;
      viewerId: string;
      participantId: string;
      delivered?: boolean;
      seen?: boolean;
      deliveredAt?: number;
      seenAt?: number;
    }) => {
      const pid = p.participantId;
      const isViewer = p.viewerId === currentUserId;
      const isParticipant = p.participantId === currentUserId;
      
      if (!isViewer && !isParticipant) return;
      
      setConversations(prev => prev.map(conv => {
        if (conv.participantId !== pid) return conv;
        const msgs = conv.messages.map(msg => {
          let shouldUpdate = false;
          
          if (isViewer) {
            shouldUpdate = msg.senderId === pid && msg.receiverId === currentUserId;
          } else if (isParticipant) {
            shouldUpdate = msg.senderId === currentUserId && msg.receiverId === p.viewerId;
          }
          
          if (shouldUpdate) {
            const next = { ...msg };
            if (p.seen && !next.seen) {
              next.seen = true;
              if (p.seenAt) next.seenAt = p.seenAt;
            }
            if (p.delivered && !next.delivered) {
              next.delivered = true;
              if (p.deliveredAt) next.deliveredAt = p.deliveredAt;
            }
            return next;
          }
          return msg;
        });
        return { ...conv, messages: msgs };
      }));
    };

    const onUnreadUpdate = () => {
      window.dispatchEvent(new Event("ink:unread-update"));
    };

    socket.on("conversation:ack", onAck);
    socket.on("unread:update", onUnreadUpdate);
    return () => {
      socket.off("conversation:ack", onAck);
      socket.off("unread:update", onUnreadUpdate);
    };
  }, [currentUserId]);

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

  const onMarkRead = useCallback(async (participantId: string) => {
    setUnreadMap(m => (m[participantId] ? { ...m, [participantId]: 0 } : m));
    window.dispatchEvent(new CustomEvent("ink:conversation-read", { detail: participantId }));
    try {
      await authFetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: participantId }),
      });
    } catch {
    }
  }, [authFetch]);

  const activeConv = useMemo(
    () => conversations.find(c => c.participantId === expandedId) || conversations[0],
    [conversations, expandedId]
  );

  useEffect(() => {
    if (expandedId && activeConv) {
      onMarkRead(expandedId);
    }
  }, [expandedId, activeConv, onMarkRead]);

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

  const fmtDateTime = (ts: number | string | undefined) => {
    try {
      if (!ts) return "";
      const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
      if (isNaN(d.getTime())) return "";
      const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
      const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return "";
    }
  };

  const onToggleCollapse = (participantId: string) =>
    setCollapsedMap(m => ({ ...m, [participantId]: !m[participantId] }));

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

  const [consultationStatus, setConsultationStatus] = useState<Record<string, { hasCompletedConsultation: boolean }>>({});
  const [depositPolicyStatus, setDepositPolicyStatus] = useState<Record<string, boolean>>({});
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositModalClientId, setDepositModalClientId] = useState<string | null>(null);

  const checkConsultationForClient = useCallback(async (clientId: string) => {
    if (isClient) return;
    try {
      const token = await getToken();
      const status = await checkConsultationStatus(currentUserId, clientId, token);
      setConsultationStatus(prev => ({ ...prev, [clientId]: status }));
    } catch (err) {
      console.error("Failed to check consultation status:", err);
    }
  }, [currentUserId, isClient, getToken]);

  const checkDepositPolicy = useCallback(async () => {
    if (isClient) return;
    try {
      const token = await getToken();
      const policy = await getArtistPolicy(currentUserId, undefined);
      const deposit = policy?.deposit || {};
      const configured = 
        (deposit.mode === "flat" && deposit.amountCents > 0) ||
        (deposit.mode === "percent" && deposit.percent > 0 && deposit.minCents > 0);
      setDepositPolicyStatus(prev => ({ ...prev, [currentUserId]: configured }));
    } catch (err) {
      console.error("Failed to check deposit policy:", err);
    }
  }, [currentUserId, isClient, getToken]);

  useEffect(() => {
    if (isClient || !currentUserId) return;
    checkDepositPolicy();
  }, [currentUserId, isClient, checkDepositPolicy]);

  useEffect(() => {
    if (!activeConv || isClient) return;
    checkConsultationForClient(activeConv.participantId);
  }, [activeConv?.participantId, isClient, checkConsultationForClient]);

  const handleOfferConsultation = async (clientId: string) => {
    if (isClient) return;
    try {
      const messageText = "I'd like to schedule a consultation with you. Please book a consultation time that works for you!";
      await sendMessage(clientId, messageText, {});
      setSendError(null);
    } catch (e: any) {
      setSendError(e?.message || "Failed to send message.");
    }
  };

  const handleOfferAppointment = async (clientId: string) => {
    if (isClient) return;
    
    const hasPolicy = depositPolicyStatus[currentUserId];
    if (!hasPolicy) {
      setDepositModalClientId(clientId);
      setDepositModalOpen(true);
      return;
    }

    try {
      const token = await getToken();
      const result = await enableClientBookings(currentUserId, clientId, token);
      
      if (!result?.ok) {
        throw new Error(result?.message || "Failed to enable appointments");
      }
      
      const messageText = "Great! I've enabled appointments for you. You can now book tattoo sessions with me!";
      await sendMessage(clientId, messageText, {});
      
      setSendError(null);
    } catch (e: any) {
      setSendError(e?.message || "Failed to enable appointments.");
    }
  };

  const handleDepositPolicySaved = () => {
    checkDepositPolicy();
    if (depositModalClientId) {
      setTimeout(() => {
        handleOfferAppointment(depositModalClientId);
      }, 500);
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
    const text = messageInput[participantId]?.trim() || "";
    const images = pendingImages[participantId] || [];
    
    if (!text && images.length === 0) return;
    
    setSendError(null);
    setExpandedId(participantId);
    setMessageInput(prev => ({ ...prev, [participantId]: "" }));
    setPendingImages(prev => ({ ...prev, [participantId]: [] }));
    
    try {
      const imageUrls = getUrlsFromText(text);
      const allImageUrls = [...new Set([...imageUrls, ...images])];
      const meta: Record<string, any> = {
        ...(allImageUrls.length > 0 ? { referenceUrls: allImageUrls } : {}),
      };
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ receiverId: participantId, text, meta, referenceUrls: allImageUrls })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      onMarkRead(participantId);
    } catch (err: any) {
      setSendError(err?.message || "Failed to send message.");
      setMessageInput(prev => ({ ...prev, [participantId]: text }));
      setPendingImages(prev => ({ ...prev, [participantId]: images }));
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

  const AvatarComponent: FC<{ conversation: Conversation; border?: boolean }> = ({ conversation, border = true }) => {
    const [imgError, setImgError] = useState(false);
    const name = displayNameFromUsername(conversation.username || "");
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(ch => ch[0]?.toUpperCase())
      .join("");
    const avatarUrl = conversation.avatarUrl;
    const withBorder = border !== false;
    
    if (avatarUrl && !imgError) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`h-7 w-7 rounded-full object-cover ${withBorder ? "border border-app" : ""}`}
          onError={() => setImgError(true)}
        />
      );
    }
    
    return (
      <span
        className={`h-7 w-7 rounded-full grid place-items-center bg-elevated text-app text-[10px] font-semibold ${withBorder ? "border border-app" : ""}`}
      >
        {initials || "?"}
      </span>
    );
  };

  const avatarFor = (c: Conversation, opts?: { border?: boolean }) => {
    return <AvatarComponent conversation={c} border={opts?.border} />;
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
          <div className="relative pointer-events-none ink-conv-image-viewer">
            <img
              key={viewerUrl || ""}
              src={viewerUrl || ""}
              alt="preview"
              className="ink-conv-image-viewer__img"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const openUpload = () => {
    if (!activeConv) return;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeConv) return;

    setUploading(true);
    setSendError(null);

    try {
      const sig = await getSignedUpload("client_ref");
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 12 * 1024 * 1024) {
          setSendError(`File ${file.name} is too large. Maximum size is 12MB.`);
          continue;
        }

        try {
          const result = await uploadToCloudinary(file, sig);
          const url = result.secure_url || result.url;
          if (url) uploadedUrls.push(url);
        } catch (err) {
          console.error("Upload error:", err);
          setSendError(`Failed to upload ${file.name}. Please try again.`);
        }
      }

      if (uploadedUrls.length > 0) {
        const id = activeConv.participantId;
        setPendingImages(prev => ({
          ...prev,
          [id]: [...(prev[id] || []), ...uploadedUrls]
        }));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setSendError(err?.message || "Failed to upload images. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openBooking = () => {
    if (!activeConv) return;
    setQbArtist({ username: activeConv.username, clerkId: activeConv.participantId });
    setQbOpen(true);
  };

  return (
    <>
      <div
        ref={appRef}
        className={`h-full w-full min-h-0 flex flex-col ${overlayActive ? "pointer-events-none" : ""}`}
      >
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
            <div className="w-full h-full flex flex-col md:hidden gap-3 overflow-y-auto">
              {isArtist && (
                <div className="flex-shrink-0 rounded-xl border border-app bg-card flex flex-col" style={{ maxHeight: "min(40vh, 300px)" }}>
                  <div className="px-3 py-2.5 border-b border-app flex items-center justify-between flex-shrink-0">
                    <div>
                      <div className="text-sm font-semibold">Message Requests</div>
                      <div className="text-xs text-muted-foreground">Review new requests</div>
                    </div>
                    {requestCount > 0 && (
                      <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-semibold">
                        {requestCount}
                      </span>
                    )}
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
                </div>
              )}
              <aside className="flex-shrink-0 rounded-xl border border-app bg-card overflow-x-auto">
                <ul className="flex gap-2 p-2">
                  {conversations.map(c => {
                    const isActive = c.participantId === activeConv?.participantId;
                    return (
                      <li key={c.participantId} className="relative group flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (expandedId !== c.participantId) setExpandedId(c.participantId);
                            onMarkRead(c.participantId);
                          }}
                          className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isActive ? "bg-elevated/60" : "hover:bg-elevated/40"}`}
                        >
                          <div className="relative">
                            {avatarFor(c, { border: false })}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDelete(c.participantId);
                              }}
                              className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 text-xs"
                              aria-label="Delete conversation"
                              title="Delete conversation"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <span className="text-xs whitespace-nowrap">{displayNameFromUsername(c.username)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>
              <div className="flex-1 min-h-0 w-full">
                  <section className="h-full rounded-xl border border-app bg-card flex flex-col min-h-0">
                    <header className="px-3 py-2.5 border-b border-app flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {conversations.length > 0 ? (
                          <Select
                            value={activeConv?.participantId || conversations[0]?.participantId || ""}
                            onValueChange={(val) => {
                              setExpandedId(val);
                              onMarkRead(val);
                            }}
                          >
                            <SelectTrigger className="h-9 focus:outline-none flex-1 max-w-full">
                              <SelectValue placeholder="Select conversation">
                                {activeConv ? displayNameFromUsername(activeConv.username) : "Select conversation"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[50vh]">
                              {conversations.map(c => (
                                <SelectItem key={c.participantId} value={c.participantId}>
                                  {displayNameFromUsername(c.username)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm text-muted-foreground">No conversations yet</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isClient && activeConv && (
                          <button
                            type="button"
                            onClick={openBooking}
                            title="Open booking"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-primary/90 bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:shadow focus:outline-none"
                          >
                            Ready to Book?
                          </button>
                        )}
                        {role === "artist" && activeConv && (() => {
                          const raw = activeConv?.meta?.lastStatus ?? null;
                          const ov = gateOverride[activeConv?.participantId || ""];
                          const v = (ov ?? raw) as GateStatus | null;
                          const needs = v === "pending" && !(ov === "accepted" || !!activeConv?.meta?.allowed);
                          const isAccepted = (ov === "accepted" || !!activeConv?.meta?.allowed) || v === "accepted";
                          const hasConsultation = consultationStatus[activeConv.participantId]?.hasCompletedConsultation || false;
                          
                          if (!needs && !isAccepted) return null;
                          return (
                            <div className="flex items-center gap-2">
                              {needs && (
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
                              {isAccepted && !hasConsultation && (
                                <button
                                  type="button"
                                  onClick={() => handleOfferConsultation(activeConv.participantId)}
                                  className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs flex items-center gap-1"
                                  title="Offer consultation to this client"
                                >
                                  <MessageSquare size={12} />
                                  Offer Consultation
                                </button>
                              )}
                              {isAccepted && hasConsultation && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOfferConsultation(activeConv.participantId)}
                                    className="px-2 py-1 rounded-md bg-elevated hover:bg-elevated/80 text-app text-xs flex items-center gap-1"
                                    title="Offer another consultation"
                                  >
                                    <MessageSquare size={12} />
                                    Consultation
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOfferAppointment(activeConv.participantId)}
                                    className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs flex items-center gap-1"
                                    title="Enable appointments for this client"
                                  >
                                    <Calendar size={12} />
                                    Offer Appointment
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </header>
                    <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 overscroll-contain min-h-0">
                      {!activeConv ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-muted-foreground text-center">
                            {conversations.length > 0 
                              ? "Select a conversation from the list above"
                              : "No conversations yet"}
                          </p>
                        </div>
                      ) : (!activeConv?.messages || activeConv.messages.length === 0) && !isClient && (activeConv?.meta?.lastStatus === "pending") ? (
                        <div className="text-sm text-muted-foreground">No messages yet. Approval required.</div>
                      ) : activeConv?.messages && activeConv.messages.length > 0 ? (
                        activeConv.messages.map((msg, idx) => {
                          const isMe = msg.senderId === currentUserId;
                          const fromMetaRef = ([] as string[])
                            .concat(msg.meta?.referenceUrls ?? [])
                            .concat(msg.meta?.workRefs ?? [])
                            .concat(msg.meta?.refs ?? []);
                          const fromText = getUrlsFromText(msg.text);
                          const merged = Array.from(new Set([...fromMetaRef, ...fromText])).slice(0, 3);
                          
                          let timestampText = "";
                          let statusText = "";
                          if (isMe) {
                            if (msg.seen) {
                              const seenTimestamp = msg.seenAt || (msg.deliveredAt && msg.seen ? msg.deliveredAt : msg.timestamp);
                              timestampText = fmtDateTime(seenTimestamp);
                              statusText = " · Seen";
                            } else if (msg.delivered) {
                              const deliveredTimestamp = msg.deliveredAt || msg.timestamp;
                              timestampText = fmtDateTime(deliveredTimestamp);
                              statusText = " · Delivered";
                            } else {
                              timestampText = fmtDateTime(msg.timestamp);
                              statusText = " · Sending";
                            }
                          } else {
                            timestampText = fmtDateTime(msg.timestamp);
                          }

                          return (
                            <div key={idx} className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`px-3 py-3 rounded-2xl max-w-[85%] w-fit break-words whitespace-pre-wrap border text-sm ${isMe ? "bg-primary text-primary-foreground border-primary/80" : "bg-elevated text-app border-app"}`}
                              >
                                <div>{msg.text}</div>
                                {!!merged.length && (
                                  <div className="mt-2 flex gap-2 items-center flex-nowrap">
                                    {merged.map(u => (
                                      <button
                                        key={u}
                                        type="button"
                                        onClick={() => setViewerUrl(u)}
                                        className="flex-shrink-0 ink-conv-image-button"
                                        title="Open"
                                        style={{ minWidth: 0 }}
                                      >
                                        <img
                                          src={u}
                                          alt="reference"
                                          className="ink-conv-chat-thumb w-full h-auto max-w-[70px] sm:max-w-[90px] md:max-w-[110px] object-cover rounded-lg"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                          style={{ width: 'auto', height: 'auto' }}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className={`mt-1 text-xs ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                  {timestampText}{statusText}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-muted-foreground text-center">No messages yet. Start the conversation!</p>
                        </div>
                      )}
                    </div>
                    {sendError && <div className="px-3 pb-2 text-xs text-destructive">{sendError}</div>}
                    {activeConv && pendingImages[activeConv.participantId] && pendingImages[activeConv.participantId].length > 0 && (
                      <div className="px-3 py-2 border-t border-app bg-elevated/50">
                        <div className="flex items-center gap-2 flex-wrap">
                          {pendingImages[activeConv.participantId].map((url, idx) => (
                            <div key={idx} className="relative group">
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingImages(prev => ({
                                    ...prev,
                                    [activeConv.participantId]: prev[activeConv.participantId].filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove image"
                              >
                                ×
                              </button>
                              <img
                                src={url}
                                alt={`Preview ${idx + 1}`}
                                className="w-14 h-14 object-cover rounded-lg border border-app"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <footer className="p-2 border-t border-app flex-shrink-0">
                      <div className="flex items-stretch gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={needsApproval && !isClient || uploading}
                        />
                        <button
                          type="button"
                          onClick={openUpload}
                          disabled={needsApproval && !isClient || uploading}
                          className="w-9 h-9 flex items-center justify-center bg-elevated hover:bg-elevated/80 text-app disabled:opacity-60 rounded-lg"
                          aria-label="Add images"
                          title="Add images"
                        >
                          {uploading ? (
                            <CircularProgress size={16} className="text-app" />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </button>
                        <div className="flex-1 flex rounded-lg overflow-hidden border border-app bg-card">
                          <input
                            type="text"
                            value={activeConv ? messageInput[activeConv.participantId] || "" : ""}
                            onChange={e =>
                              activeConv && setMessageInput(prev => ({ ...prev, [activeConv.participantId]: e.target.value }))
                            }
                            className="flex-1 p-2 text-sm bg-transparent text-app placeholder:text-muted-foreground focus:outline-none"
                            placeholder={
                              needsApproval && !isClient
                                ? "Approve to enable messaging"
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
                            className="w-9 h-9 flex items-center justify-center bg-elevated hover:bg-elevated/80 text-app disabled:opacity-60"
                            aria-label="Send message"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </footer>
                  </section>
              </div>
            </div>
            <div className={`hidden md:grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] h-full min-h-0 flex-1 w-full`}>
              <aside className="hidden md:block h-full rounded-xl bg-card min-h-0 overflow-y-auto">
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
                          {avatarFor(c, { border: false })}
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
                        <SelectTrigger className="h-9 focus:outline-none">
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
                      const isAccepted = (ov === "accepted" || !!activeConv?.meta?.allowed) || v === "accepted";
                      if (!needs && !isAccepted) return null;
                      return (
                        <div className="flex items-center gap-2">
                          {needs && (
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
                          {isAccepted && (
                            <button
                              type="button"
                              onClick={() => handleEnableAppointments(activeConv.participantId)}
                              className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs flex items-center gap-1"
                              title="Enable appointments for this client"
                            >
                              <Calendar size={12} />
                              Enable Appointments
                            </button>
                          )}
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
                      
                      let timestampText = "";
                      let statusText = "";
                      if (isMe) {
                        if (msg.seen) {
                          const seenTimestamp = msg.seenAt || (msg.deliveredAt && msg.seen ? msg.deliveredAt : msg.timestamp);
                          timestampText = fmtDateTime(seenTimestamp);
                          statusText = " · Seen";
                        } else if (msg.delivered) {
                          const deliveredTimestamp = msg.deliveredAt || msg.timestamp;
                          timestampText = fmtDateTime(deliveredTimestamp);
                          statusText = " · Delivered";
                        } else {
                          timestampText = fmtDateTime(msg.timestamp);
                          statusText = " · Sending";
                        }
                      } else {
                        timestampText = fmtDateTime(msg.timestamp);
                      }

                      return (
                        <div key={idx} className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`px-3 py-4 rounded-2xl max-w-[80%] sm:max-w-[66%] md:max-w-[50%] w-fit break-words whitespace-pre-wrap border leading-loose text-[15px] ${isMe ? "bg-primary text-primary-foreground border-primary/80" : "bg-elevated text-app border-app"}`}
                          >
                            <div>{msg.text}</div>
                            {!!merged.length && (
                              <div className="mt-2 flex gap-2 items-center flex-nowrap">
                                {merged.map(u => (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => setViewerUrl(u)}
                                    className="flex-shrink-0 ink-conv-image-button"
                                    title="Open"
                                    style={{ minWidth: 0 }}
                                  >
                                    <img
                                      src={u}
                                      alt="reference"
                                      className="ink-conv-chat-thumb w-full h-auto max-w-[70px] sm:max-w-[90px] md:max-w-[110px] object-cover rounded-lg"
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                      style={{ width: 'auto', height: 'auto' }}
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className={`mt-1 text-[13px] ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {timestampText}{statusText}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {sendError && <div className="px-4 pb-2 text-sm text-destructive">{sendError}</div>}
                {activeConv && pendingImages[activeConv.participantId] && pendingImages[activeConv.participantId].length > 0 && (
                  <div className="px-4 py-2 border-t border-app bg-elevated/50">
                    <div className="flex items-center gap-2 flex-wrap">
                      {pendingImages[activeConv.participantId].map((url, idx) => (
                        <div key={idx} className="relative group">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingImages(prev => ({
                                ...prev,
                                [activeConv.participantId]: prev[activeConv.participantId].filter((_, i) => i !== idx)
                              }));
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                          <img
                            src={url}
                            alt={`Preview ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-app"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <footer className="p-2.5 md:p-3 border-t border-app">
                  <div className="flex items-stretch gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={needsApproval && !isClient || uploading}
                    />
                    <button
                      type="button"
                      onClick={openUpload}
                      disabled={needsApproval && !isClient || uploading}
                      className="w-10 h-10 md:w-10 md:h-10 flex items-center justify-center bg-elevated hover:bg-elevated/80 text-app disabled:opacity-60"
                      aria-label="Add images"
                      title="Add images"
                    >
                      {uploading ? (
                        <CircularProgress size={18} className="text-app" />
                      ) : (
                        <ImageIcon size={18} />
                      )}
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
                        className="w-10 h-10 md:w-10 md:h-10 flex items-center justify-center bg-elevated hover:bg-elevated/80 text-app disabled:opacity-60"
                        aria-label="Send message"
                      >
                        <Send size={18} />
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
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? "bg-elevated/60" : "hover:bg-elevated/40"}`}
                        >
                          {avatarFor(c, { border: false })}
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
      {role === "artist" && currentUserId && (
        <DepositPolicyModal
          artistId={currentUserId}
          open={depositModalOpen}
          onClose={() => {
            setDepositModalOpen(false);
            setDepositModalClientId(null);
          }}
          onSuccess={handleDepositPolicySaved}
        />
      )}
    </>
  );
};

export default ChatWindow;