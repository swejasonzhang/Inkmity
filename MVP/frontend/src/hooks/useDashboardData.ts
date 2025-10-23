import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { fetchArtists, type Artist } from "@/api";
import { toast } from "react-toastify";

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
  const { isLoaded, isSignedIn } = useUser();

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

  async function loadFirst(filters: ArtistFilters = {}) {
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
  }

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
  }, [isLoaded, isSignedIn]);

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