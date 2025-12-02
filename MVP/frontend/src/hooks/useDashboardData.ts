import { useEffect, useRef, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { fetchArtists, type Artist } from "@/api";
import { toast } from "react-toastify";
import { connectSocket, getSocket } from "@/lib/socket";

type ArtistFilters = {
  search?: string;
  location?: string;
  style?: string;
  availability?: string;
  experience?: string;
  booking?: string;
  travel?: string;
  sort?: string;
};

const PAGE_SIZE = 12;

export function useDashboardData() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const lastFilters = useRef<ArtistFilters>({});
  const reqRef = useRef<AbortController | null>(null);

  async function query(filters: ArtistFilters = {}, pageArg = 1) {
    const params: Record<string, string> = {
      page: String(pageArg),
      pageSize: String(PAGE_SIZE),
      sort: filters.sort || "rating_desc",
    };
    if (filters.search) params.search = filters.search;
    if (filters.location && filters.location !== "all")
      params.location = filters.location;
    if (filters.style && filters.style !== "all") params.style = filters.style;
    if (filters.availability && filters.availability !== "all")
      params.availability = filters.availability;
    if (filters.experience && filters.experience !== "all")
      params.experience = filters.experience;
    if (filters.booking && filters.booking !== "all")
      params.booking = filters.booking;
    if (filters.travel && filters.travel !== "all")
      params.travel = filters.travel;

    reqRef.current?.abort();
    reqRef.current = new AbortController();

    return fetchArtists(params);
  }

  const loadFirst = useCallback(async (filters: ArtistFilters = {}) => {
    if (!isLoaded || !isSignedIn) {
      setArtists([]);
      setTotal(0);
      setHasMore(false);
      setInitialized(true);
      return;
    }
    setLoading(true);
    try {
      lastFilters.current = filters;
      const res = await query(filters, 1);
      setArtists(res.items);
      setTotal(res.total);
      setPage(1);
      setHasMore(res.items.length < res.total);
      setInitialized(true);
      toast.dismiss();
    } catch (e: any) {
      toast.error(e?.message || "Error loading artists", {
        position: "bottom-right",
      });
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await query(lastFilters.current, next);
      setArtists((prev) => [...prev, ...res.items]);
      setPage(next);
      const loaded = (next - 1) * PAGE_SIZE + res.items.length;
      setHasMore(loaded < res.total);
    } catch (e: any) {
      toast.error(e?.message || "Error loading more artists", {
        position: "bottom-right",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFirst({});
    return () => reqRef.current?.abort();
  }, [loadFirst]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const socket = getSocket();
    let listenerAdded = false;

    const handleProfileUpdate = () => {
      void loadFirst(lastFilters.current);
    };

    const setupListener = () => {
      if (!listenerAdded) {
        socket.on("artist:profile:updated", handleProfileUpdate);
        listenerAdded = true;
      }
    };

    const setupSocket = async () => {
      try {
        if (!socket.connected) {
          await connectSocket(getToken, user.id);
        }
        setupListener();
      } catch (error) {
        console.error("Failed to connect socket for dashboard updates:", error);
      }
    };

    if (socket.connected) {
      setupListener();
    } else {
      socket.once("connect", setupListener);
      void setupSocket();
    }

    return () => {
      if (listenerAdded) {
        socket.off("artist:profile:updated", handleProfileUpdate);
      }
    };
  }, [isLoaded, isSignedIn, user, getToken, loadFirst]);

  return {
    artists,
    total,
    loading,
    initialized,
    hasMore,
    loadFirst,
    loadMore,
    PAGE_SIZE,
  };
}