import { useEffect, useRef, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { apiGet } from "@/lib/api";

export interface ArtistDto {
  _id: string;
  username: string;
  location?: string;
  styles?: string[];
  rating?: number;
  reviewsCount?: number;
  yearsExperience?: number;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  createdAt?: string;
}

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
  const { getToken } = useAuth();

  const [artists, setArtists] = useState<ArtistDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const lastFilters = useRef<ArtistFilters>({});
  const reqRef = useRef<AbortController | null>(null);

  async function queryArtists(filters: ArtistFilters = {}, pageArg = 1) {
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

    const token = isSignedIn ? await getToken() : undefined;

    reqRef.current?.abort();
    const ac = new AbortController();
    reqRef.current = ac;

    const res = await apiGet<{
      items: ArtistDto[];
      total: number;
      page: number;
      pageSize: number;
    }>("/users/artists", params, token ?? undefined, ac.signal);
    return res;
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
      const res = await queryArtists(filters, 1);
      setArtists(res.items);
      setTotal(res.total);
      setPage(1);
      setHasMore(res.items.length + 0 < res.total);
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
      const res = await queryArtists(lastFilters.current, next);
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