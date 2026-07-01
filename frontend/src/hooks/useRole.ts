import { useEffect, useState, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe } from "@/api";
import { getCachedRole, setCachedRole, clearCachedRole } from "@/lib/roleCache";
import { resolveRole, type Role } from "@/lib/role";

export function useRole() {
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();
  const [role, setRole] = useState<Role>(() => getCachedRole() ?? "client");
  const [ready, setReady] = useState<boolean>(() => getCachedRole() != null);
  const fetchedUserIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  if (typeof jest !== "undefined") {
    fetchedUserIdRef.current = null;
  }

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) {
      setRole("client");
      setReady(true);
      clearCachedRole();
      fetchedUserIdRef.current = null;
      inFlightRef.current = null;
      return;
    }

    const userId = user?.id;
    if (!userId) return;

    if (fetchedUserIdRef.current === userId) {
      if (!ready) {
        setReady(true);
      }
      return;
    }

    if (inFlightRef.current) {
      inFlightRef.current.then(() => {
        if (fetchedUserIdRef.current === userId && !ready) {
          setReady(true);
        }
      }).catch(() => {});
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const ac = abortControllerRef.current;

    let cancelled = false;
    const requestPromise = (async () => {
      try {
        const token = await getToken();
        if (cancelled || ac.signal.aborted) return;
        const me = await getMe({ token: token ?? undefined, signal: ac.signal });
        if (cancelled || ac.signal.aborted) return;
        const resolved = resolveRole(me?.role, user?.publicMetadata?.role);
        setRole(resolved);
        setCachedRole(resolved);
        fetchedUserIdRef.current = userId;
      } catch (e: any) {
        if (cancelled || ac.signal.aborted || e?.name === "AbortError") return;
        const fallbackRole = resolveRole(null, user?.publicMetadata?.role);
        setRole(fallbackRole);
        setCachedRole(fallbackRole);
        fetchedUserIdRef.current = userId;
      } finally {
        inFlightRef.current = null;
        if (!cancelled && !ac.signal.aborted) {
          setReady(true);
        }
      }
    })();

    inFlightRef.current = requestPromise;

    return () => {
      cancelled = true;
      ac.abort();
      inFlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch role once per user; getToken is stable, ready/publicMetadata are read as fallbacks and adding them would refetch-churn
  }, [clerkLoaded, isSignedIn, user?.id]);

  return { role, isLoaded: ready, isSignedIn };
}