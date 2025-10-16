import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Conversation, Message } from "@/components/dashboard/ChatWindow";
import { toast } from "react-toastify";

export interface ArtistDto {
  _id: string;
  clerkId?: string;
  username: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  images?: string[];
  socialLinks?: { platform: string; url: string }[];
  isAvailableNow?: boolean;
  nextAvailableDate?: string | null;
  acceptingWaitlist?: boolean;
  isClosed?: boolean;
}

type ArtistFilters = {
  search?: string;
  location?: string;
  style?: string;
  price?: string;
  availability?: string;
  sort?: string;
};

const ENV_API =
  (import.meta as any)?.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_URL ||
  "";
const PRIMARY_BASE = String(ENV_API).replace(/\/$/, "");
const API_BASES = [PRIMARY_BASE, "/api"].filter(Boolean);

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, "");
  const p = String(path).replace(/^\//, "");
  return b ? `${b}/${p}` : `/${p}`;
}

function parsePrice(price?: string): { min?: number; max?: number } {
  if (!price || price === "all") return {};
  if (price.endsWith("+"))
    return { min: Number(price.replace("+", "")) || undefined };
  const [min, max] = price.split("-").map((n) => Number(n));
  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
  };
}

export function useDashboardData() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [artists, setArtists] = useState<ArtistDto[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [showArtists, setShowArtists] = useState(false);

  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [collapsedConversations, setCollapsedConversations] = useState<
    Record<string, boolean>
  >({});
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const prevConvCountRef = useRef(0);
  const artistReqRef = useRef<AbortController | null>(null);
  const workingBaseRef = useRef<string | null>(null);

  const authFetch = async (pathOrUrl: string, options: RequestInit = {}) => {
    const token = await getToken();
    const isAbs = /^https?:\/\//i.test(pathOrUrl);
    const base = workingBaseRef.current || API_BASES[0] || "";
    const url = isAbs ? pathOrUrl : joinUrl(base, pathOrUrl);
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  };

  const authFetchJson = async (path: string, options: RequestInit = {}) => {
    const token = await getToken();
    const bases = workingBaseRef.current ? [workingBaseRef.current] : API_BASES;
    let lastErr: any = null;
    for (let i = 0; i < bases.length; i++) {
      const url = joinUrl(bases[i], path);
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
          },
        });
        const ctype = res.headers.get("content-type") || "";
        const text = await res.text().catch(() => "");
        if (!res.ok)
          throw new Error(
            `HTTP ${res.status} ${res.statusText} @ ${url}\n${
              text ? text.slice(0, 300) : "(no body)"
            }`
          );
        if (!ctype.toLowerCase().includes("application/json"))
          throw new Error(
            `Non-JSON response @ ${url}\n${
              text ? text.slice(0, 300) : "(empty)"
            }`
          );
        const json = JSON.parse(text);
        if (!workingBaseRef.current) workingBaseRef.current = bases[i];
        return json;
      } catch (e: any) {
        lastErr = e;
        continue;
      }
    }
    throw lastErr || new Error("Unknown network error");
  };

  const normalizeMessages = (msgs: any[] = []): Message[] =>
    msgs.map((m) => ({
      senderId: m.senderId,
      receiverId: m.receiverId,
      text: m.text,
      timestamp:
        typeof m.timestamp === "number"
          ? m.timestamp
          : m.createdAt
          ? new Date(m.createdAt).getTime()
          : Date.now(),
    }));

  const queryArtists = async (
    filters: ArtistFilters = {},
    page = 1,
    pageSize = 12
  ): Promise<{ items: ArtistDto[]; total: number }> => {
    if (artistReqRef.current) artistReqRef.current.abort();
    const ac = new AbortController();
    artistReqRef.current = ac;
    setLoadingArtists(true);
    try {
      const params = new URLSearchParams();
      const { min, max } = parsePrice(filters.price);
      if (filters.search) params.set("search", filters.search);
      if (filters.location && filters.location !== "all")
        params.set("location", filters.location);
      if (filters.style && filters.style !== "all")
        params.set("style", filters.style);
      if (typeof min === "number") params.set("priceMin", String(min));
      if (typeof max === "number") params.set("priceMax", String(max));
      if (filters.availability && filters.availability !== "all")
        params.set("availability", filters.availability);
      params.set("page", String(Math.max(1, page)));
      params.set("pageSize", String(Math.max(1, Math.min(48, pageSize))));
      params.set("sort", filters.sort || "rating_desc");
      const json = (await authFetchJson(`/users?${params.toString()}`, {
        signal: ac.signal,
      })) as { items: ArtistDto[]; total: number } | ArtistDto[];
      const payload = Array.isArray(json)
        ? { items: json, total: json.length }
        : json;
      setArtists(payload.items || []);
      return payload;
    } catch (e: any) {
      if (e?.name === "AbortError") return { items: [], total: 0 };
      throw e;
    } finally {
      if (!artistReqRef.current?.signal.aborted) setLoadingArtists(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const loadAll = async () => {
      setLoadingArtists(true);
      setLoadingConversations(true);
      try {
        const payload = await queryArtists({ sort: "rating_desc" }, 1, 12);
        const artistsNow = payload.items || [];
        let convList: Conversation[] = [];
        try {
          const raw = await authFetchJson(`/messages/user/${user.id}`);
          convList = Array.isArray(raw)
            ? raw.map((c: any) => ({
                participantId: c.participantId,
                username: c.username ?? "Unknown",
                messages: normalizeMessages(c.messages),
              }))
            : [];
          convList = convList.map((c) => {
            if (c.username !== "Unknown") return c;
            const artist = artistsNow.find(
              (a) => a.clerkId === c.participantId || a._id === c.participantId
            );
            return { ...c, username: artist?.username ?? "Unknown" };
          });
          convList.sort((a, b) => {
            const aLast = a.messages.length
              ? a.messages[a.messages.length - 1].timestamp
              : 0;
            const bLast = b.messages.length
              ? b.messages[b.messages.length - 1].timestamp
              : 0;
            return bLast - aLast;
          });
        } catch {
          convList = [];
        }
        setConversationList(convList);
        if (convList.length > 0) {
          const newest = convList[0].participantId;
          setSelectedConversationId(newest);
          setCollapsedConversations((prev) => ({ ...prev, [newest]: false }));
        }
        toast.success("Artists loaded", {
          position: "bottom-right",
          autoClose: 1500,
        });
      } catch (err: any) {
        console.error("Error fetching data:", err);
        toast.error(
          err?.message?.includes("ERR_CONNECTION_REFUSED")
            ? "API unreachable. Start your backend or use a Vite proxy."
            : err?.message || "Error loading dashboard data.",
          { position: "bottom-right" }
        );
      } finally {
        setLoadingArtists(false);
        setLoadingConversations(false);
      }
    };
    loadAll();
  }, [user]);

  useEffect(() => {
    if (conversationList.length > prevConvCountRef.current) {
      const newest = conversationList[0];
      if (newest) {
        setSelectedConversationId(newest.participantId);
        setCollapsedConversations((prev) => ({
          ...prev,
          [newest.participantId]: false,
        }));
      }
    }
    prevConvCountRef.current = conversationList.length;
  }, [conversationList]);

  useEffect(() => {
    const t = setTimeout(() => setShowArtists(true), 900);
    return () => clearTimeout(t);
  }, []);

  return {
    artists,
    conversationList,
    collapsedConversations,
    selectedConversationId,
    loadingArtists,
    loadingConversations,
    showArtists,
    setConversationList,
    setCollapsedConversations,
    setSelectedConversationId,
    queryArtists,
    authFetch,
  };
}
