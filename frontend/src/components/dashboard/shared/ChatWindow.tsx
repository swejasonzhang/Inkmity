import type { FC } from "react";
import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Send, Image as ImageIcon, X, Calendar, MessageSquare, Inbox, Lock } from "lucide-react";
import { displayNameFromUsername } from "@/lib/format";
import { formatActivityStatus } from "@/utils/activity";
import QuickBooking from "../client/QuickBooking";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RequestPanel from "./messages/requestPanel";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "@/api";
import { socket } from "@/lib/socket";
import { getSignedUpload, uploadToCloudinary } from "@/lib/cloudinary";
import { enableClientBookings, getArtistPolicy, type PieceSize } from "@/api";
import DepositPolicyModal from "./DepositPolicyModal";

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
  handle?: string;
  messages: Message[];
  meta?: { lastStatus?: "pending" | "accepted" | "declined" | null; allowed?: boolean; blocked?: boolean; bookingEnabled?: boolean };
  isTyping?: boolean;
  isOnline?: boolean;
  lastActive?: number | null;
  lastSeen?: number;
};

type GateStatus = "pending" | "accepted" | "declined";
type Role = "client" | "artist";

const PIECE_SIZE_LABELS: Record<PieceSize, { label: string; sessions: number; hint: string }> = {
  flash: { label: "Flash / small", sessions: 1, hint: "A few hours — one sitting" },
  small: { label: "Small", sessions: 1, hint: "One sitting" },
  medium: { label: "Medium", sessions: 2, hint: "Up to 2 sittings" },
  large: { label: "Large", sessions: 3, hint: "Up to 3 sittings" },
  sleeve: { label: "Sleeve", sessions: 5, hint: "A few days — up to 5 sittings" },
  back_piece: { label: "Back piece", sessions: 8, hint: "Several days — up to 8 sittings" },
};
const PIECE_SIZE_ORDER: PieceSize[] = ["flash", "small", "medium", "large", "sleeve", "back_piece"];

interface ChatWindowProps {
  currentUserId: string;
  isArtist?: boolean;
  role?: Role;
  onRemoveConversation?: (participantId: string) => void;
}

const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
const getUrlsFromText = (text: string) =>
  Array.from(new Set((text.match(urlRegex) || [])?.map(u => u.replace(/[),.]+$/, ""))));

const getFaviconUrl = (url: string): string | null => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return null;
  }
};

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
  const [declineConfirmOpen, setDeclineConfirmOpen] = useState(false);
  const [pendingDeclineId, setPendingDeclineId] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [sizePickerClientId, setSizePickerClientId] = useState<string | null>(null);
  const [gateOverride, setGateOverride] = useState<Record<string, GateStatus | undefined>>({});
  const prevExpandedRef = useRef<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [qbOpen, setQbOpen] = useState(false);
  const [qbArtist, setQbArtist] = useState<{ username: string; clerkId: string; handle?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [mobileRequestsOpen, setMobileRequestsOpen] = useState(false);
  const messagesContainerRefMobile = useRef<HTMLDivElement | null>(null);
  const messagesContainerRefDesktop = useRef<HTMLDivElement | null>(null);

  const appRef = useRef<HTMLDivElement | null>(null);
  const [bookTip, setBookTip] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });

  const stickToBottomRef = useRef(true);
  const scrollToBottom = () => {
    [messagesContainerRefMobile.current, messagesContainerRefDesktop.current].forEach((el) => {
      if (el) el.scrollTop = el.scrollHeight;
    });
  };
  const overlayActive = confirmOpen || declineConfirmOpen || !!viewerUrl || !!sizePickerClientId;

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
      const isViewer = p.viewerId === currentUserId;
      const isParticipant = p.participantId === currentUserId;

      if (!isViewer && !isParticipant) return;

      const pid = isViewer ? p.participantId : p.viewerId;

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

    const onMessageNew = (p: {
      convoId: string;
      message: Message;
    }) => {
      const msg = p.message;
      const pid = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
      const cid = msg.meta?.clientId;
      setConversations(prev => {
        const existing = prev.find(c => c.participantId === pid);
        if (!existing) return prev;
        if (cid && existing.messages.some(m => m.meta?.clientId === cid)) {
          return prev.map(conv =>
            conv.participantId === pid
              ? { ...conv, messages: conv.messages.map(m => (m.meta?.clientId === cid ? { ...msg } : m)).sort((a, b) => a.timestamp - b.timestamp) }
              : conv
          );
        }
        const msgExists = existing.messages.some(
          m => m.timestamp === msg.timestamp && m.senderId === msg.senderId
        );
        if (msgExists) return prev;
        return prev.map(conv => {
          if (conv.participantId !== pid) return conv;
          const updatedMessages = [...conv.messages, msg].sort((a, b) => a.timestamp - b.timestamp);
          return {
            ...conv,
            messages: updatedMessages,
          };
        });
      });
      if (stickToBottomRef.current) requestAnimationFrame(() => scrollToBottom());
    };

    const onDeclined = (p: {
      convoId: string;
      declines: number;
      blocked: boolean;
      remainingRequests: number;
    }) => {
      setConversations(prev => prev.map(conv => {
        if (conv.participantId && p.convoId.includes(conv.participantId)) {
          return {
            ...conv,
            meta: {
              ...(conv.meta || {}),
              lastStatus: "declined",
              allowed: false,
              blocked: p.blocked,
              declines: p.declines,
            },
          };
        }
        return conv;
      }));
    };

    const onUnreadUpdate = () => {
      window.dispatchEvent(new Event("ink:unread-update"));
      if (isArtist && !isClient) {
        (async () => {
          try {
            const res = await authFetch("/api/messages/requests", { method: "GET" });
            const data = res.ok ? await res.json() : null;
            const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
            setRequestCount(list.length);
          } catch {
            setRequestCount(0);
          }
        })();
      }
    };

    const handleUserOnline = (data: { clerkId: string }) => {
      setConversations(prev => prev.map(c =>
        c.participantId === data.clerkId ? { ...c, isOnline: true } : c
      ));
    };

    const handleUserOffline = (data: { clerkId: string }) => {
      setConversations(prev => prev.map(c =>
        c.participantId === data.clerkId ? { ...c, isOnline: false } : c
      ));
    };

    const handleActivityUpdate = (data: { userId: string; lastActive: number }) => {
      setConversations(prev => prev.map(c =>
        c.participantId === data.userId ? { ...c, lastActive: data.lastActive } : c
      ));
    };

    const handleBookingEnabled = (data: { artistId: string; clientId: string }) => {
      if (data.clientId !== currentUserId) return;
      setConversations(prev => prev.map(c =>
        c.participantId === data.artistId
          ? { ...c, meta: { ...(c.meta || {}), bookingEnabled: true } }
          : c
      ));
    };

    socket.on("conversation:ack", onAck);
    socket.on("message:new", onMessageNew);
    socket.on("conversation:declined", onDeclined);
    socket.on("unread:update", onUnreadUpdate);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);
    socket.on("user:activity:updated", handleActivityUpdate);
    socket.on("booking:enabled", handleBookingEnabled);
    return () => {
      socket.off("conversation:ack", onAck);
      socket.off("message:new", onMessageNew);
      socket.off("conversation:declined", onDeclined);
      socket.off("unread:update", onUnreadUpdate);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
      socket.off("user:activity:updated", handleActivityUpdate);
      socket.off("booking:enabled", handleBookingEnabled);
    };
  }, [currentUserId, authFetch, isArtist, isClient]);

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
    if (!isClient) return;
    const handleProfileUpdate = () => {
      if (!currentUserId) return;
      const mounted = true;
      (async () => {
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
        } catch (error) {
          console.error("Failed to refresh conversations after profile update:", error);
        }
      })();
    };
    window.addEventListener("ink:client-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("ink:client-profile-updated", handleProfileUpdate);
  }, [isClient, currentUserId, authFetch]);

  useEffect(() => {
    if (!confirmOpen && !declineConfirmOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmOpen, declineConfirmOpen]);

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

  const lastMessageTs = useCallback((c: Conversation) => {
    const last = c.messages[c.messages.length - 1];
    const t = last?.timestamp;
    return typeof t === "number" ? t : t ? new Date(t).getTime() : 0;
  }, []);

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => lastMessageTs(b) - lastMessageTs(a)),
    [conversations, lastMessageTs]
  );

  const activeConv = useMemo(
    () => conversations.find(c => c.participantId === expandedId) || sortedConversations[0],
    [conversations, expandedId, sortedConversations]
  );

  useEffect(() => {
    if (expandedId && activeConv) {
      onMarkRead(expandedId);
    }
  }, [expandedId, activeConv, onMarkRead]);

  useLayoutEffect(() => {
    if (!expandedId) return;
    stickToBottomRef.current = true;
    scrollToBottom();
    const raf = requestAnimationFrame(() => scrollToBottom());
    const t = window.setTimeout(() => scrollToBottom(), 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [expandedId, activeConv?.participantId]);

  useEffect(() => {
    if (activeConv?.messages?.length && stickToBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [activeConv?.messages?.length, activeConv?.participantId]);

  useEffect(() => {
    const els = [messagesContainerRefMobile.current, messagesContainerRefDesktop.current]
      .filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;
    const onScroll = (e: Event) => {
      const el = e.currentTarget as HTMLDivElement;
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) scrollToBottom();
    });
    els.forEach((el) => {
      el.addEventListener("scroll", onScroll, { passive: true });
      ro.observe(el);
    });
    return () => {
      els.forEach((el) => el.removeEventListener("scroll", onScroll));
      ro.disconnect();
    };
  }, [expandedId, activeConv?.participantId, conversations.length]);

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
      window.dispatchEvent(new Event("ink:requests-reset"));
      try {
        const reqRes = await authFetch("/api/messages/requests", { method: "GET" });
        if (reqRes.ok) {
          const reqData = reqRes.ok ? await reqRes.json() : null;
          const reqList = Array.isArray(reqData?.requests) ? reqData.requests : Array.isArray(reqData) ? reqData : [];
          setRequestCount(reqList.length);
        }
      } catch {}
    } catch (e: any) {
      setSendError(e?.message || "Failed to accept request.");
    }
  };

  const handleDeclineClick = (participantId: string) => {
    if (isClient) return;
    setPendingDeclineId(participantId);
    setDeclineConfirmOpen(true);
    setDeclineError(null);
  };

  const cancelDecline = () => {
    setDeclineConfirmOpen(false);
    setPendingDeclineId(null);
    setDeclineError(null);
  };

  const confirmDecline = async () => {
    if (!pendingDeclineId || isClient) return;
    setDeclining(true);
    setDeclineError(null);
    try {
      const id = await fetchRequestsAndFindId(pendingDeclineId);
      if (!id) {
        setDeclineError("No pending request found for this user.");
        setDeclining(false);
        return;
      }
      const res = await authFetch(`/api/messages/requests/${id}/decline`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `Decline failed ${res.status}`);
      }
      setGateOverride(m => ({ ...m, [pendingDeclineId]: "declined" }));
      setConversations(list =>
        list.map(c =>
          c.participantId === pendingDeclineId ? { ...c, meta: { ...(c.meta || {}), lastStatus: "declined", allowed: false, blocked: true } } : c
        )
      );
      window.dispatchEvent(new Event("ink:requests-reset"));
      try {
        const reqRes = await authFetch("/api/messages/requests", { method: "GET" });
        if (reqRes.ok) {
          const reqData = reqRes.ok ? await reqRes.json() : null;
          const reqList = Array.isArray(reqData?.requests) ? reqData.requests : Array.isArray(reqData) ? reqData : [];
          setRequestCount(reqList.length);
        }
      } catch {}
      setDeclineConfirmOpen(false);
      setPendingDeclineId(null);
    } catch (e: any) {
      setDeclineError(e?.message || "Failed to decline request.");
    } finally {
      setDeclining(false);
    }
  };

  const [depositPolicyStatus, setDepositPolicyStatus] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const openArtistProfile = useCallback(() => {
    if (!isClient || !activeConv?.handle) return;
    try { sessionStorage.setItem("inkmity_reopen_conversation", activeConv.participantId); } catch { }
    navigate(`/artist/${(activeConv.handle || "").replace(/^@/, "")}`);
  }, [isClient, activeConv?.handle, activeConv?.participantId, navigate]);

  useEffect(() => {
    let id: string | null = null;
    try { id = sessionStorage.getItem("inkmity_reopen_conversation"); } catch { }
    if (id) {
      setExpandedId(id);
      try { sessionStorage.removeItem("inkmity_reopen_conversation"); } catch { }
    }
  }, []);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositModalClientId, setDepositModalClientId] = useState<string | null>(null);

  const checkDepositPolicy = useCallback(async () => {
    if (isClient) return;
    try {
      const policy = await getArtistPolicy(currentUserId, undefined);
      const deposit = policy?.deposit || {};
      const configured =
        (deposit.mode === "flat" && (deposit.amountCents ?? 0) > 0) ||
        (deposit.mode === "percent" && (deposit.percent ?? 0) > 0 && (deposit.minCents ?? 0) > 0);
      setDepositPolicyStatus(prev => ({ ...prev, [currentUserId]: configured }));
    } catch (err) {
      console.error("Failed to check deposit policy:", err);
    }
  }, [currentUserId, isClient]);

  useEffect(() => {
    if (isClient || !currentUserId) return;
    checkDepositPolicy();
  }, [currentUserId, isClient, checkDepositPolicy]);

  const sendMessage = useCallback(async (participantId: string, text: string, imageUrls: string[] = []) => {
    try {
      const conv = conversations.find(c => c.participantId === participantId);
      if (conv?.meta?.blocked) {
        throw new Error("Messaging has been disabled for this artist. They have declined your request.");
      }

      const allImageUrls = [...new Set([...getUrlsFromText(text), ...imageUrls])];
      const meta: Record<string, any> = {
        ...(allImageUrls.length > 0 ? { referenceUrls: allImageUrls } : {}),
      };
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ receiverId: participantId, text, meta, referenceUrls: allImageUrls })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData?.error === "blocked_by_declines") {
          throw new Error("Messaging has been disabled for this artist. They have declined your request.");
        }
        throw new Error(`Server returned ${res.status}`);
      }
      onMarkRead(participantId);
    } catch (err: any) {
      throw new Error(err?.message || "Failed to send message.");
    }
  }, [authFetch, onMarkRead, conversations]);

  const enableBookingForClient = async (clientId: string, pieceSize: PieceSize) => {
    try {
      const token = await getToken();
      const result = await enableClientBookings(currentUserId, clientId, { pieceSize }, token);
      if (!result?.ok) {
        throw new Error(result?.message || "Failed to enable appointments");
      }
      const sessions = result?.permission?.maxSessions ?? PIECE_SIZE_LABELS[pieceSize].sessions;
      const sittings = sessions === 1 ? "a single sitting" : `up to ${sessions} sittings`;
      const messageText = `Great! I've enabled booking for you. Based on the size of your piece (${PIECE_SIZE_LABELS[pieceSize].label}), you can schedule ${sittings}. Book your consultation and sessions with me whenever you're ready!`;
      await sendMessage(clientId, messageText, []);
      window.dispatchEvent(new CustomEvent("ink:booking-enabled", {
        detail: { artistId: currentUserId, clientId }
      }));
      setConversations(prev => prev.map(c =>
        c.participantId === clientId ? { ...c, meta: { ...(c.meta || {}), bookingEnabled: true } } : c
      ));
      setSendError(null);
    } catch (e: any) {
      setSendError(e?.message || "Failed to enable appointments.");
    }
  };

  const handleOfferAppointment = async (clientId: string) => {
    if (isClient) return;
    if (!depositPolicyStatus[currentUserId]) {
      setDepositModalClientId(clientId);
      setDepositModalOpen(true);
      return;
    }
    setSizePickerClientId(clientId);
  };

  const handleDepositPolicySaved = () => {
    setDepositPolicyStatus((prev) => ({ ...prev, [currentUserId]: true }));
    const clientId = depositModalClientId;
    setDepositModalClientId(null);
    setDepositModalOpen(false);
    checkDepositPolicy();
    if (clientId) setSizePickerClientId(clientId);
  };

  const confirmPieceSize = async (pieceSize: PieceSize) => {
    const clientId = sizePickerClientId;
    setSizePickerClientId(null);
    if (clientId) await enableBookingForClient(clientId, pieceSize);
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
  const isBlocked = activeConv?.meta?.blocked || false;
  const needsApproval = isClient ? false : status === "pending" && !canSend;
  const isMessagingDisabled = isClient && isBlocked;

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-full bg-card rounded-2xl">
        <Spinner className="text-[color:var(--fg)]" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-card rounded-2xl">
        <Spinner className="text-[color:var(--fg)]" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    const emptyMessage = isClient
      ? "No conversations currently.\nPlease click an artist to start one."
      : "No conversations with a client just yet, they will reach out to you.";

    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full bg-card rounded-2xl p-6 text-center">
        <span className="grid place-items-center h-12 w-12 rounded-2xl border border-white/40 bg-elevated">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="text-muted-foreground whitespace-pre-line max-w-xs text-sm leading-relaxed">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const handleSend = async (participantId: string) => {
    const text = messageInput[participantId]?.trim() || "";
    const images = pendingImages[participantId] || [];

    if (!text && images.length === 0) return;

    const conv = conversations.find(c => c.participantId === participantId);
    if (conv?.meta?.blocked) {
      setSendError("Messaging has been disabled for this artist. They have declined your request.");
      return;
    }

    setSendError(null);
    setExpandedId(participantId);
    setMessageInput(prev => ({ ...prev, [participantId]: "" }));
    setPendingImages(prev => ({ ...prev, [participantId]: [] }));

    const imageUrls = getUrlsFromText(text);
    const allImageUrls = [...new Set([...imageUrls, ...images])];
    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const meta: Record<string, any> = {
      clientId,
      ...(allImageUrls.length > 0 ? { referenceUrls: allImageUrls } : {}),
    };

    const optimistic: Message = {
      senderId: currentUserId,
      receiverId: participantId,
      text,
      timestamp: Date.now(),
      delivered: false,
      seen: false,
      meta,
    };
    setConversations(prev => prev.map(conv =>
      conv.participantId === participantId
        ? { ...conv, messages: [...conv.messages, optimistic].sort((a, b) => a.timestamp - b.timestamp) }
        : conv
    ));
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom());

    try {
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ receiverId: participantId, text, meta, referenceUrls: allImageUrls })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData?.error === "blocked_by_declines") {
          throw new Error("Messaging has been disabled for this artist. They have declined your request.");
        }
        throw new Error(`Server returned ${res.status}`);
      }

      const newMessage: Message = await res.json();
      setConversations(prev => prev.map(conv => {
        if (conv.participantId !== participantId) return conv;
        let replaced = false;
        const msgs = conv.messages.map(m => {
          if (m.meta?.clientId && m.meta.clientId === clientId) {
            replaced = true;
            return { ...newMessage, meta: { ...(newMessage.meta || {}), clientId } };
          }
          return m;
        });
        const dup = msgs.some(m => m !== newMessage && m.timestamp === newMessage.timestamp && m.senderId === newMessage.senderId && m.meta?.clientId !== clientId);
        if (!replaced && !dup) msgs.push(newMessage);
        return { ...conv, messages: msgs.sort((a, b) => a.timestamp - b.timestamp) };
      }));

      onMarkRead(participantId);
    } catch (err: any) {
      setConversations(prev => prev.map(conv =>
        conv.participantId === participantId
          ? { ...conv, messages: conv.messages.filter(m => m.meta?.clientId !== clientId) }
          : conv
      ));
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

  const AvatarComponent: FC<{ conversation: Conversation; border?: boolean; fill?: boolean }> = ({ conversation, border = true, fill = false }) => {
    const [imgError, setImgError] = useState(false);
    const name = displayNameFromUsername(conversation.username || "");
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(ch => ch[0]?.toUpperCase())
      .join("");
    const avatarUrl = conversation.avatarUrl;
    const withBorder = border !== false && !fill;

    if (avatarUrl && !imgError) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`rounded-full object-cover ${fill ? "absolute inset-0 block h-full w-full" : ""} ${withBorder ? "border border-app" : ""}`}
          style={fill ? undefined : { width: 'clamp(1.5rem, 2vw, 1.75rem)', height: 'clamp(1.5rem, 2vw, 1.75rem)' }}
          onError={() => setImgError(true)}
        />
      );
    }

    return (
      <span
        className={`rounded-full grid place-items-center bg-elevated text-app font-semibold ${fill ? "absolute inset-0 h-full w-full text-xs" : ""} ${withBorder ? "border border-app" : ""}`}
        style={fill ? undefined : { width: 'clamp(1.5rem, 2vw, 1.75rem)', height: 'clamp(1.5rem, 2vw, 1.75rem)', fontSize: 'clamp(0.5rem, 0.8vw, 0.625rem)' }}
      >
        {initials || "?"}
      </span>
    );
  };

  const avatarFor = (c: Conversation, opts?: { border?: boolean; fill?: boolean }) => {
    return <AvatarComponent conversation={c} border={opts?.border} fill={opts?.fill} />;
  };

  const modal = (
    <>
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
              className="relative bg-card text-app rounded-xl shadow-2xl border border-app flex flex-col items-center text-center"
            style={{ padding: 'clamp(1rem, 2vw, 1.5rem)', width: 'clamp(280px, 85vw, 448px)', maxWidth: '90vw' }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold mb-2">Delete conversation?</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                This can't be undone — the conversation and your contact with this {isClient ? "artist" : "client"} will be permanently deleted and <span className="font-semibold text-app">cannot be recovered</span>. You'll only be able to reach out again if they message you first.
              </p>
              {deleteError && <div className="mb-3 text-sm text-destructive">{deleteError}</div>}
              <div className="flex justify-center gap-3">
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
      <AnimatePresence>
        {declineConfirmOpen && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal="true"
            role="dialog"
            onClick={cancelDecline}
          >
            <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close dialog" />
            <motion.div
              className="relative bg-card text-app rounded-xl shadow-2xl border border-app"
              style={{ padding: 'clamp(1rem, 2vw, 1.5rem)', width: 'clamp(280px, 85vw, 448px)', maxWidth: '90vw' }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold mb-2">Decline Message Request?</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                This action cannot be undone. You will permanently cut contact with this client and they will not be able to message you again. A respectful message will be sent to notify them.
              </p>
              {declineError && <div className="mb-3 text-sm text-destructive">{declineError}</div>}
              <div className="flex justify-end gap-3">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    cancelDecline();
                  }}
                  disabled={declining}
                  className="px-4 py-2 rounded-md bg-elevated hover:bg-elevated/80 text-app text-sm disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    confirmDecline();
                  }}
                  disabled={declining}
                  className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm disabled:opacity-60"
                >
                  {declining ? "Declining..." : "Confirm Decline"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {sizePickerClientId && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal="true"
            role="dialog"
            onClick={() => setSizePickerClientId(null)}
          >
            <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close dialog" />
            <motion.div
              className="relative bg-card text-app rounded-xl shadow-2xl border border-app"
              style={{ padding: 'clamp(1rem, 2vw, 1.5rem)', width: 'clamp(280px, 85vw, 448px)', maxWidth: '90vw' }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold mb-1">How big is this piece?</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                This sets how many dates the client can schedule. A flash stays a single sitting; larger work can span several.
              </p>
              <div className="flex flex-col gap-2">
                {PIECE_SIZE_ORDER.map((size) => (
                  <button
                    key={size}
                    onClick={e => { e.stopPropagation(); void confirmPieceSize(size); }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-app bg-elevated hover:bg-elevated/70 text-left transition-colors"
                  >
                    <span className="text-sm font-semibold">{PIECE_SIZE_LABELS[size].label}</span>
                    <span className="text-xs text-muted-foreground">{PIECE_SIZE_LABELS[size].hint}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={e => { e.stopPropagation(); setSizePickerClientId(null); }}
                  className="px-4 py-2 rounded-md bg-elevated hover:bg-elevated/80 text-app text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
                          className="fixed rounded-full grid place-items-center border border-app bg-elevated text-app hover:bg-elevated/80"
                          style={{ top: 'clamp(0.75rem, 2vw, 1.5rem)', right: 'clamp(0.75rem, 2vw, 1.5rem)', width: 'clamp(2.25rem, 3vw, 2.75rem)', height: 'clamp(2.25rem, 3vw, 2.75rem)' }}
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
    setQbArtist({ username: activeConv.username, clerkId: activeConv.participantId, handle: activeConv.handle });
    setQbOpen(true);
  };

  return (
    <>
      <div
        ref={appRef}
        className={`h-full w-full min-h-0 flex flex-col ${overlayActive ? "pointer-events-none" : ""}`}
      >
        <div className="w-full flex-1 min-h-0 bg-card rounded-2xl p-1.5 md:p-3 flex gap-2 md:gap-3">
          {isArtist && (
            <aside
              className="hidden md:flex flex-col border border-app bg-card h-full shrink-0 rounded-xl min-h-0"
              style={{ width: 'clamp(280px, 20vw, 360px)' }}
            >
              <div className="px-3 py-3 border-b border-app text-center">
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
            <div className="w-full h-full flex md:hidden gap-1 min-h-0 relative">
              <div className="w-12 flex-shrink-0 flex flex-col items-center gap-2 min-h-0">
                {isArtist && (
                  <button
                    type="button"
                    onClick={() => setMobileRequestsOpen((v) => !v)}
                    className={`relative shrink-0 grid place-items-center h-10 w-10 rounded-full border border-app transition ${mobileRequestsOpen ? "bg-elevated" : "bg-card hover:bg-elevated/60"}`}
                    aria-label="Message requests"
                    title="Message requests"
                  >
                    <Inbox size={16} />
                    {requestCount > 0 && (
                      <span className="absolute -top-1 -right-1 grid place-items-center min-w-[1rem] h-4 px-1 rounded-full bg-white text-black text-[9px] font-semibold">{requestCount}</span>
                    )}
                  </button>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl bg-card p-1.5 flex flex-col items-center gap-2 w-full">
                  {sortedConversations.map(c => {
                    const isActive = c.participantId === activeConv?.participantId;
                    return (
                      <div key={c.participantId} className="relative group flex-shrink-0">
                        <button
                          onClick={() => {
                            if (expandedId !== c.participantId) setExpandedId(c.participantId);
                            onMarkRead(c.participantId);
                          }}
                          className={`relative block h-10 w-10 rounded-full overflow-hidden p-0 transition ${isActive ? "ring-2 ring-app" : "hover:bg-elevated/60"}`}
                          title={displayNameFromUsername(c.username)}
                        >
                          {avatarFor(c, { border: false, fill: true })}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(c.participantId);
                          }}
                          className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-5 w-5 rounded-full bg-neutral-700 text-white opacity-0 group-hover:opacity-100 hover:bg-neutral-600 transition shadow leading-none"
                          aria-label="Delete conversation"
                          title="Delete conversation"
                        >
                          <X size={12} strokeWidth={2.5} className="block shrink-0" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-0 min-h-0">
                  <section className="h-full rounded-xl border border-app bg-card flex flex-col min-h-0">
                    <header className="px-2 py-2.5 border-b border-app flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {conversations.length > 0 ? (
                          <div className="flex items-center gap-2 min-w-0 flex-1 w-full">
                            {activeConv && avatarFor(activeConv, { border: false })}
                            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                              {activeConv && isClient && activeConv.handle ? (
                                <button
                                  type="button"
                                  onClick={openArtistProfile}
                                  className="text-sm font-semibold text-app truncate text-left hover:underline focus:outline-none min-w-0"
                                  title={`View ${displayNameFromUsername(activeConv.username)}'s profile`}
                                >
                                  {displayNameFromUsername(activeConv.username)}
                                </button>
                              ) : (
                                <span className="text-sm font-semibold text-app truncate min-w-0">
                                  {activeConv ? displayNameFromUsername(activeConv.username) : "Select a conversation"}
                                </span>
                              )}
                              {activeConv && (
                                <span className="shrink-0 text-[11px] text-app whitespace-nowrap">
                                  {formatActivityStatus(activeConv.isOnline, activeConv.lastActive)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {isClient
                              ? "No conversations currently. Please click an artist to start one."
                              : "No conversations with a client just yet, they will reach out to you."}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {isClient && activeConv && (() => {
                          const bookingAllowed = !!activeConv?.meta?.bookingEnabled;
                          return (
                            <div
                              className="relative"
                              onMouseMove={!bookingAllowed ? (e) => setBookTip({ show: true, x: e.clientX, y: e.clientY }) : undefined}
                              onMouseLeave={!bookingAllowed ? () => setBookTip((t) => ({ ...t, show: false })) : undefined}
                            >
                              <button
                                type="button"
                                onClick={bookingAllowed ? openBooking : undefined}
                                disabled={!bookingAllowed}
                                className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${bookingAllowed ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground opacity-60 cursor-not-allowed"}`}
                              >
                                <Calendar size={undefined} style={{ width: 'clamp(0.625rem, 1vw, 0.75rem)', height: 'clamp(0.625rem, 1vw, 0.75rem)' }} />
                                Ready to Book?
                              </button>
                            </div>
                          );
                        })()}
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
                                    onClick={() => handleDeclineClick(activeConv.participantId)}
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
                              {isAccepted && (() => {
                                const enabled = !!activeConv?.meta?.bookingEnabled;
                                return (
                                  <button
                                    type="button"
                                    onClick={enabled ? undefined : () => handleOfferAppointment(activeConv.participantId)}
                                    disabled={enabled}
                                    className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${enabled ? "bg-elevated text-muted-foreground opacity-70 cursor-default" : "bg-primary text-primary-foreground"}`}
                                    title={enabled ? "Booking is already enabled for this client" : "Allow this client to book consultations and appointments"}
                                  >
                                    <Calendar size={undefined} style={{ width: 'clamp(0.625rem, 1vw, 0.75rem)', height: 'clamp(0.625rem, 1vw, 0.75rem)' }} />
                                    {enabled ? "Booking Enabled" : "Allow Booking"}
                                  </button>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                    </header>
                    <div
                      ref={(el) => { messagesContainerRefMobile.current = el; }}
                      className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5 overscroll-contain min-h-0"
                    >
                      {!activeConv ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-muted-foreground text-center">
                            {conversations.length > 0
                              ? "Select a conversation from the list above"
                              : (isClient
                                  ? "No conversations currently. Please click an artist to start one."
                                  : "No conversations with a client just yet, they will reach out to you.")}
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
                          const isLastMsg = idx === activeConv.messages.length - 1;
                          if (isMe && isLastMsg) {
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
                            <div key={idx} className={`w-full flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              <div
                                className={`px-3 py-1.5 rounded-2xl w-fit break-words whitespace-pre-wrap border text-[13px] leading-snug overflow-hidden shadow-sm ${isMe ? "bg-primary text-primary-foreground border-primary/80 rounded-br-md" : "bg-elevated text-app border-app rounded-bl-md"}`}
                                style={{ maxWidth: 'clamp(150px, 85vw, 85%)' }}
                              >
                                <div className="whitespace-pre-wrap break-words">
                                  {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                    part.match(/^https?:\/\//) ? (
                                      <a
                                        key={i}
                                        href={part}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 underline hover:opacity-80"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        {getFaviconUrl(part) && (
                                          <img
                                            src={getFaviconUrl(part)!}
                                            alt=""
                                            className="w-4 h-4 flex-shrink-0"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <span>{part}</span>
                                      </a>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    )
                                  )}
                                </div>
                                {!!merged.length && (
                                  <div className="mt-2 flex gap-2 items-center flex-nowrap" style={{ maxWidth: '100%', width: '100%' }}>
                                    {merged.map(u => (
                                      <button
                                        key={u}
                                        type="button"
                                        onClick={() => setViewerUrl(u)}
                                        className="flex-shrink-1 ink-conv-image-button"
                                        title="Open"
                                        style={{ minWidth: 0, flex: '1 1 0%', maxWidth: `calc((100% - ${(merged.length - 1) * 8}px) / ${merged.length})` }}
                                      >
                                        <img
                                          src={u}
                                          alt="reference"
                                          className="ink-conv-chat-thumb w-full h-auto object-contain rounded-lg"
                                          style={{ maxWidth: '100%', width: 'auto', height: 'auto', maxHeight: '120px' }}
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className={`mt-0.5 px-1 text-[10px] text-muted-foreground ${isMe ? "text-right" : "text-left"}`}>
                                {timestampText}{statusText}
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
                                className="object-cover rounded-lg border border-app"
                                style={{ width: 'clamp(3rem, 4vw, 4.5rem)', height: 'clamp(3rem, 4vw, 4.5rem)' }}
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <footer className="p-2 border-t border-app flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={(needsApproval && !isClient) || isMessagingDisabled || uploading}
                        />
                        <button
                          type="button"
                          onClick={openUpload}
                          disabled={(needsApproval && !isClient) || isMessagingDisabled || uploading}
                          className="shrink-0 grid place-items-center h-10 w-10 rounded-full bg-elevated hover:bg-elevated/70 text-app disabled:opacity-60 transition"
                          aria-label="Add images"
                          title="Add images"
                        >
                          {uploading ? <Spinner size={16} className="text-[color:var(--fg)]" /> : <ImageIcon size={16} />}
                        </button>
                        <input
                          type="text"
                          value={activeConv ? messageInput[activeConv.participantId] || "" : ""}
                          onChange={e =>
                            activeConv && setMessageInput(prev => ({ ...prev, [activeConv.participantId]: e.target.value }))
                          }
                          className="flex-1 min-w-0 h-10 rounded-full border border-app px-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                          placeholder={
                            isMessagingDisabled
                              ? "Messaging disabled - artist declined your request"
                              : needsApproval && !isClient
                                ? "Approve to enable messaging"
                                : status === "declined" && !isClient
                                  ? "Messaging locked"
                                  : "Type a message"
                          }
                          disabled={(needsApproval && !isClient) || isMessagingDisabled}
                          onKeyDown={e => {
                            if ((needsApproval && !isClient) || isMessagingDisabled) return;
                            if (e.key === "Enter" && activeConv) handleSend(activeConv.participantId);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => activeConv && (!needsApproval || isClient) && !isMessagingDisabled && handleSend(activeConv.participantId)}
                          disabled={(needsApproval && !isClient) || isMessagingDisabled}
                          className="shrink-0 grid place-items-center h-10 w-10 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50 transition active:scale-95"
                          aria-label="Send message"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </footer>
                  </section>
              </div>
              {isArtist && mobileRequestsOpen && (
                <div className="absolute inset-0 z-20 rounded-xl border border-app bg-card flex flex-col">
                  <div className="px-3 py-2.5 border-b border-app flex items-center justify-between">
                    <span className="text-sm font-semibold">Message requests</span>
                    <button type="button" onClick={() => setMobileRequestsOpen(false)} className="flex items-center justify-center h-10 w-10 p-0 rounded-full hover:bg-elevated shrink-0" aria-label="Close requests">
                      <X size={26} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <RequestPanel authFetch={authFetch} onOpenConversation={(clerkId) => { setExpandedId(clerkId); setMobileRequestsOpen(false); try { window.dispatchEvent(new CustomEvent("ink:set-expanded-conversation", { detail: clerkId })); } catch { } }} />
                  </div>
                </div>
              )}
            </div>
            <div className="hidden md:grid gap-3 h-full min-h-0 flex-1 w-full" style={{ gridTemplateColumns: 'clamp(180px, 15vw, 260px) minmax(0, 1fr)' }}>
              <aside className="hidden md:block h-full rounded-xl bg-card min-h-0 overflow-y-auto">
                <ul>
                  {sortedConversations.map(c => {
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
                          className={`group w-full flex items-center gap-3 px-3 py-2.5 text-left border-l-2 transition-colors ${isActive ? "bg-elevated/60 border-app" : "border-transparent hover:bg-elevated/40"}`}
                        >
                          {avatarFor(c, { border: false })}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="text-sm text-app truncate">{displayNameFromUsername(c.username)}</div>
                                {c.isOnline && (
                                  <span className="shrink-0 w-2 h-2 rounded-full bg-white" title="Currently active" />
                                )}
                              </div>
                              <div className="text-[13px] shrink-0">{lastMsg ? fmtTime(lastMsg.timestamp) : ""}</div>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {formatActivityStatus(c.isOnline, c.lastActive)}
                            </div>
                          </div>
                          {!!unreadMap[c.participantId] && (
                            <span className="ml-2 shrink-0 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-semibold">
                              {unreadMap[c.participantId]}
                            </span>
                          )}
                          <button
                            type="button"
                            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-app hover:bg-card transition"
                            onClick={e => {
                              e.stopPropagation();
                              requestDelete(c.participantId);
                            }}
                            aria-label="Delete conversation"
                            title="Delete conversation"
                          >
                            <X size={14} className="block shrink-0" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </aside>
              <section className="h-full rounded-xl border border-app bg-card flex flex-col min-h-0">
                <header className="px-3 md:px-4 py-3 border-b border-app flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="md:hidden" style={{ minWidth: 'clamp(160px, 40vw, 240px)', maxWidth: '60vw' }}>
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
                          {sortedConversations.map(c => (
                            <SelectItem key={c.participantId} value={c.participantId}>
                              {displayNameFromUsername(c.username)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      {activeConv && (
                        <div className="relative h-9 w-9 rounded-full overflow-hidden border border-app shrink-0">
                          {avatarFor(activeConv, { border: false, fill: true })}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 items-start text-left">
                        <div className="flex flex-col items-start gap-0.5">
                          {activeConv && isClient && activeConv.handle ? (
                            <span
                              role="link"
                              tabIndex={0}
                              onClick={openArtistProfile}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openArtistProfile(); }}
                              className="text-sm font-semibold text-app truncate text-left cursor-pointer hover:underline focus:outline-none"
                              title={`View ${displayNameFromUsername(activeConv.username)}'s profile`}
                            >
                              {displayNameFromUsername(activeConv.username)}
                            </span>
                          ) : (
                            <div className="text-sm font-semibold text-app truncate">
                              {activeConv ? displayNameFromUsername(activeConv.username) : "Conversation"}
                            </div>
                          )}
                          {activeConv && (
                            <span className="shrink-0 text-[11px] text-app whitespace-nowrap">
                              {formatActivityStatus(activeConv.isOnline, activeConv.lastActive)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {isClient && activeConv && (() => {
                      const bookingAllowed = !!activeConv?.meta?.bookingEnabled;
                      return (
                        <div
                          className="relative"
                          onMouseMove={!bookingAllowed ? (e) => setBookTip({ show: true, x: e.clientX, y: e.clientY }) : undefined}
                          onMouseLeave={!bookingAllowed ? () => setBookTip((t) => ({ ...t, show: false })) : undefined}
                        >
                          <button
                            type="button"
                            onClick={bookingAllowed ? openBooking : undefined}
                            disabled={!bookingAllowed}
                            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${bookingAllowed ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground opacity-60 cursor-not-allowed"}`}
                          >
                            <Calendar size={undefined} style={{ width: 'clamp(0.625rem, 1vw, 0.75rem)', height: 'clamp(0.625rem, 1vw, 0.75rem)' }} />
                            Ready to Book?
                          </button>
                        </div>
                      );
                    })()}
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
                                onClick={() => handleDeclineClick(activeConv.participantId)}
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
                          {isAccepted && (() => {
                            const enabled = !!activeConv?.meta?.bookingEnabled;
                            return (
                              <button
                                type="button"
                                onClick={enabled ? undefined : () => handleOfferAppointment(activeConv.participantId)}
                                disabled={enabled}
                                className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${enabled ? "bg-elevated text-muted-foreground opacity-70 cursor-default" : "bg-primary text-primary-foreground"}`}
                                title={enabled ? "Booking is already enabled for this client" : "Allow this client to book consultations and appointments"}
                              >
                                <Calendar size={undefined} style={{ width: 'clamp(0.625rem, 1vw, 0.75rem)', height: 'clamp(0.625rem, 1vw, 0.75rem)' }} />
                                {enabled ? "Booking Enabled" : "Allow Booking"}
                              </button>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                </header>
                <div
                  ref={(el) => { messagesContainerRefDesktop.current = el; }}
                  className="flex-1 overflow-y-auto px-3 md:px-4 py-2 flex flex-col gap-1.5 overscroll-contain min-h-0"
                >
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
                      const isLastMsg = idx === (activeConv?.messages?.length ?? 0) - 1;
                      if (isMe && isLastMsg) {
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
                        <div key={idx} className={`w-full flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-3 py-1.5 rounded-2xl w-fit break-words whitespace-pre-wrap border leading-snug overflow-hidden shadow-sm ${isMe ? "bg-primary text-primary-foreground border-primary/80 rounded-br-md" : "bg-elevated text-app border-app rounded-bl-md"}`}
                            style={{ maxWidth: 'clamp(150px, min(80vw, 50%), 600px)', fontSize: 'clamp(0.8125rem, 0.9vw, 0.875rem)' }}
                          >
                            <div className="whitespace-pre-wrap break-words">
                              {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                part.match(/^https?:\/\//) ? (
                                  <a
                                    key={i}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 underline hover:opacity-80"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                        {getFaviconUrl(part) && (
                                          <img
                                            src={getFaviconUrl(part)!}
                                            alt=""
                                            className="w-4 h-4 flex-shrink-0"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <span>{part}</span>
                                  </a>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )}
                            </div>
                            {!!merged.length && (
                              <div className="mt-2 flex gap-2 items-center flex-nowrap" style={{ maxWidth: '100%', width: '100%' }}>
                                {merged.map(u => (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => setViewerUrl(u)}
                                    className="flex-shrink-1 ink-conv-image-button"
                                    title="Open"
                                    style={{ minWidth: 0, flex: '1 1 0%', maxWidth: `calc((100% - ${(merged.length - 1) * 8}px) / ${merged.length})` }}
                                  >
                                    <img
                                      src={u}
                                      alt="reference"
                                      className="ink-conv-chat-thumb w-full h-auto object-contain rounded-lg"
                                      style={{ maxWidth: '100%', width: 'auto', height: 'auto', maxHeight: '120px' }}
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={`mt-0.5 px-1 text-[10px] text-muted-foreground ${isMe ? "text-right" : "text-left"}`}>
                            {timestampText}{statusText}
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
                            className="object-cover rounded-lg border border-app"
                          style={{ width: 'clamp(3.5rem, 5vw, 5rem)', height: 'clamp(3.5rem, 5vw, 5rem)' }}
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <footer className="p-2.5 md:p-3 border-t border-app">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={(needsApproval && !isClient) || isMessagingDisabled || uploading}
                    />
                    <button
                      type="button"
                      onClick={openUpload}
                      disabled={(needsApproval && !isClient) || isMessagingDisabled || uploading}
                      className="shrink-0 grid place-items-center h-11 w-11 rounded-full bg-elevated hover:bg-elevated/70 text-app disabled:opacity-60 transition"
                      aria-label="Add images"
                      title="Add images"
                    >
                      {uploading ? <Spinner size={18} className="text-app" /> : <ImageIcon size={18} />}
                    </button>
                    <input
                      type="text"
                      value={activeConv ? messageInput[activeConv.participantId] || "" : ""}
                      onChange={e =>
                        activeConv && setMessageInput(prev => ({ ...prev, [activeConv.participantId]: e.target.value }))
                      }
                      className="flex-1 min-w-0 h-11 rounded-full border border-app px-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                      placeholder={
                        isMessagingDisabled
                          ? "Messaging disabled - artist declined your request"
                          : needsApproval && !isClient
                            ? isArtist
                              ? "Approve to enable messaging"
                              : "Waiting for approval"
                            : status === "declined" && !isClient
                              ? "Messaging locked"
                              : "Type a message"
                      }
                      disabled={(needsApproval && !isClient) || isMessagingDisabled}
                      onKeyDown={e => {
                        if ((needsApproval && !isClient) || isMessagingDisabled) return;
                        if (e.key === "Enter" && activeConv) handleSend(activeConv.participantId);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => activeConv && (!needsApproval || isClient) && !isMessagingDisabled && handleSend(activeConv.participantId)}
                      disabled={(needsApproval && !isClient) || isMessagingDisabled}
                      className="shrink-0 grid place-items-center h-11 w-11 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50 transition active:scale-95"
                      aria-label="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </footer>
              </section>
              <aside className="md:hidden rounded-xl border border-app bg-card overflow-x-auto">
                <ul className="flex gap-2 p-2">
                  {sortedConversations.map(c => {
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
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs truncate">{displayNameFromUsername(c.username)}</span>
                              {c.isOnline && (
                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-white" title="Currently active" />
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {formatActivityStatus(c.isOnline, c.lastActive)}
                            </span>
                          </div>
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
      {bookTip.show && typeof window !== "undefined" && createPortal(
        <div
          className="fixed z-[2147483600] pointer-events-none ink-gate-tip"
          style={{ left: bookTip.x, top: bookTip.y, transform: "translate(-50%, 18px)" }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-app bg-card px-3 py-2 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)] ring-1 ring-[color-mix(in_srgb,var(--fg)_25%,transparent)]">
            <span className="inline-grid place-items-center rounded-lg border border-app/40 bg-elevated p-1.5">
              <Lock className="h-3.5 w-3.5 text-app" />
            </span>
            <span className="text-[12px] font-bold text-app whitespace-nowrap">Wait for the artist to allow booking</span>
          </div>
        </div>,
        document.body
      )}
      <QuickBooking
        open={qbOpen}
        artist={qbArtist ? ({ username: qbArtist.username, clerkId: qbArtist.clerkId, handle: qbArtist.handle } as any) : undefined}
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