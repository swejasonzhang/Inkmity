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

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed ${res.status}: ${text}`);
    }
    return res;
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

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingArtists(true);
      setLoadingConversations(true);

      try {
        const artistsRes = await authFetch(
          "http://localhost:5005/api/users?role=artist"
        );
        const artistsData: ArtistDto[] = await artistsRes.json();
        setArtists(artistsData);

        const convRes = await authFetch(
          `http://localhost:5005/api/messages/user/${user.id}`
        );
        const raw = await convRes.json();

        let convList: Conversation[] = Array.isArray(raw)
          ? raw.map((c: any) => ({
              participantId: c.participantId,
              username: c.username ?? "Unknown",
              messages: normalizeMessages(c.messages),
            }))
          : [];

        convList = convList.map((c) => {
          if (c.username !== "Unknown") return c;
          const artist = artistsData.find(
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

        setConversationList(convList);

        if (convList.length > 0) {
          const newest = convList[0].participantId;
          setSelectedConversationId(newest);
          setCollapsedConversations((prev) => ({ ...prev, [newest]: false }));
        }

        toast.success("Artists and conversations loaded!", {
          position: "bottom-right",
          autoClose: 2000,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Error loading dashboard data.", {
          position: "bottom-right",
        });
      } finally {
        setLoadingArtists(false);
        setLoadingConversations(false);
      }
    };

    fetchData();
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
    authFetch,
  };
}