import { useEffect, useRef, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { apiGet, API_URL } from "@/lib/api";

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
  price?: string;
  availability?: string;
  experience?: string;
  booking?: string;
  travel?: string;
  sort?: string;
};

export function useDashboardData() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [artists, setArtists] = useState<ArtistDto[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const toastsRef = useRef(false);

  async function queryArtists(
    filters: ArtistFilters = {},
    page = 1,
    pageSize = 12
  ) {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
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
    const data = await apiGet<
      { items: ArtistDto[]; total?: number } | ArtistDto[]
    >("/users/artists", params, token ?? undefined);
    return Array.isArray(data)
      ? { items: data, total: data.length }
      : { items: data.items, total: data.total ?? data.items.length };
  }

  async function loadAll() {
    if (!isLoaded || !isSignedIn) {
      setInitialized(true);
      setLoadingArtists(false);
      return;
    }
    setLoadingArtists(true);
    try {
      const res = await queryArtists({ sort: "rating_desc" }, 1, 12);
      setArtists(res.items);
      if (!toastsRef.current) {
        toastsRef.current = true;
        toast.success("Artists loaded", {
          position: "bottom-right",
          autoClose: 1200,
        });
      }
    } catch (e: any) {
      toast.error(e?.message || "Error loading artists", {
        position: "bottom-right",
      });
    } finally {
      setLoadingArtists(false);
      setInitialized(true);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [isLoaded, isSignedIn]);

  return {
    API_URL,
    artists,
    loadingArtists,
    initialized,
    queryArtists,
    refreshDashboard: loadAll,
  };
}