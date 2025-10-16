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
  reviewsCount?: number;
  images?: string[];
  socialLinks?: { platform: string; url: string }[];
  isAvailableNow?: boolean;
  nextAvailableDate?: string | null;
  acceptingWaitlist?: boolean;
  isClosed?: boolean;
  yearsExperience?: number;
  availabilityCode?: "7d" | "lt1m" | "1to3m" | "lte6m" | "waitlist";
  availabilityDays?: number;
  createdAt?: string | number | Date;
  tags?: string[];
}

type ArtistFilters = {
  search?: string;
  location?: string;
  style?: string;
  price?: string;
  availability?: string;
  experience?: string;
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

function expBoundsForCategory(cat?: string): {
  min?: number;
  max?: number;
  plus?: boolean;
} {
  if (!cat || cat === "all") return {};
  const v = String(cat).toLowerCase();
  if (v === "amateur") return { min: 0, max: 2 };
  if (v === "experienced") return { min: 3, max: 5 };
  if (v === "professional") return { min: 6, max: 10 };
  if (v === "veteran") return { min: 10, max: Infinity, plus: true };
  return {};
}

function parseExperience(exp?: string): {
  min?: number;
  max?: number;
  plus?: boolean;
} {
  if (!exp || exp === "all") return {};
  const cat = expBoundsForCategory(exp);
  if (cat.min !== undefined || cat.max !== undefined) return cat;
  if (exp.endsWith("+"))
    return { min: Number(exp.replace("+", "")) || 0, plus: true };
  const [min, max] = exp.split("-").map((n) => Number(n));
  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
  };
}

function inAvailability(a: ArtistDto, code?: string) {
  if (!code || code === "all") return true;
  if (a.availabilityCode) return a.availabilityCode === code;
  if (typeof a.availabilityDays === "number") {
    const d = a.availabilityDays;
    if (code === "7d") return d <= 7;
    if (code === "lt1m") return d <= 30;
    if (code === "1to3m") return d > 30 && d <= 90;
    if (code === "lte6m") return d <= 180;
    if (code === "waitlist") return d === Infinity || d < 0;
  }
  return true;
}

function matchesSearch(a: ArtistDto, q?: string) {
  const s = (q || "").trim().toLowerCase();
  if (!s) return true;
  const hay = [
    a.username,
    a.bio,
    a.location,
    ...(a.style ?? []),
    ...(a.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}

function bayesianScore(avg?: number, n?: number, C = 3.8, m = 8) {
  const a = typeof avg === "number" ? avg : 0;
  const count = typeof n === "number" ? n : 0;
  return (C * m + a * count) / (m + count);
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

  const applyClientFilters = (list: ArtistDto[], filters: ArtistFilters) => {
    const { min: pMin, max: pMax } = parsePrice(filters.price);
    const { min: eMin, max: eMax, plus } = parseExperience(filters.experience);
    return list.filter((a) => {
      if (!matchesSearch(a, filters.search)) return false;
      if (
        filters.location &&
        filters.location !== "all" &&
        a.location !== filters.location
      )
        return false;
      if (
        filters.style &&
        filters.style !== "all" &&
        !(a.style ?? []).includes(filters.style)
      )
        return false;
      if (pMin !== undefined || pMax !== undefined) {
        const pr = a.priceRange;
        if (pr) {
          const ok =
            (pMin === undefined || pr.max >= pMin) &&
            (pMax === undefined || pr.min <= pMax);
          if (!ok) return false;
        }
      }
      if (filters.experience && filters.experience !== "all") {
        const y = a.yearsExperience;
        if (typeof y !== "number") return false;
        if (plus && eMin !== undefined) {
          if (y < eMin) return false;
        } else {
          if (
            (eMin !== undefined && y < eMin) ||
            (eMax !== undefined && y > eMax)
          )
            return false;
        }
      }
      if (!inAvailability(a, filters.availability)) return false;
      return true;
    });
  };

  const sortClient = (list: ArtistDto[], sort?: string) => {
    if (sort === "experience_desc" || sort === "experience_asc") {
      return list
        .slice()
        .sort((a, b) =>
          sort === "experience_desc"
            ? (b.yearsExperience ?? -Infinity) -
              (a.yearsExperience ?? -Infinity)
            : (a.yearsExperience ?? Infinity) - (b.yearsExperience ?? Infinity)
        );
    }
    if (sort === "newest") {
      return list
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        );
    }
    return list.slice().sort((a, b) => {
      const sa = bayesianScore(a.rating, a.reviewsCount);
      const sb = bayesianScore(b.rating, b.reviewsCount);
      if (sb !== sa) return sb - sa;
      if ((b.reviewsCount ?? 0) !== (a.reviewsCount ?? 0))
        return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  };

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
      const {
        min: eMin,
        max: eMax,
        plus,
      } = parseExperience(filters.experience);
      if (filters.search) params.set("search", filters.search);
      if (filters.location && filters.location !== "all")
        params.set("location", filters.location);
      if (filters.style && filters.style !== "all")
        params.set("style", filters.style);
      if (typeof min === "number") params.set("priceMin", String(min));
      if (typeof max === "number") params.set("priceMax", String(max));
      if (filters.availability && filters.availability !== "all")
        params.set("availability", filters.availability);
      if (typeof eMin === "number") params.set("expMin", String(eMin));
      if (!plus && typeof eMax === "number") params.set("expMax", String(eMax));
      params.set("page", String(Math.max(1, page)));
      params.set("pageSize", String(Math.max(1, Math.min(48, pageSize))));
      params.set("sort", filters.sort || "rating_desc");

      const json = (await authFetchJson(`/users?${params.toString()}`, {
        signal: ac.signal,
      })) as { items: ArtistDto[]; total: number } | ArtistDto[];

      const raw = Array.isArray(json) ? json : json.items || [];
      const filtered = applyClientFilters(raw, filters);
      const sorted = sortClient(filtered, filters.sort);
      const total = sorted.length;
      const start = (Math.max(1, page) - 1) * Math.max(1, pageSize);
      const end = start + Math.max(1, pageSize);
      const items = sorted.slice(start, end);

      setArtists(items);
      return { items, total };
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
