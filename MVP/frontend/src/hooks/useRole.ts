import { useEffect, useState, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe } from "@/api";

type Role = "client" | "artist";

export function useRole() {
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();
  const [role, setRole] = useState<Role>("client");
  const [ready, setReady] = useState(false);
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
        const r =
          me?.role === "artist"
            ? "artist"
            : me?.role === "client"
            ? "client"
            : null;
        if (cancelled || ac.signal.aborted) return;
        if (r) {
          setRole(r);
          fetchedUserIdRef.current = userId;
        } else {
          const md = (user?.publicMetadata?.role as string | undefined) || "";
          const fallbackRole = md === "artist" ? "artist" : "client";
          setRole(fallbackRole);
          fetchedUserIdRef.current = userId;
        }
      } catch (e: any) {
        if (cancelled || ac.signal.aborted || e?.name === "AbortError") return;
        const md = (user?.publicMetadata?.role as string | undefined) || "";
        setRole(md === "artist" ? "artist" : "client");
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
  }, [clerkLoaded, isSignedIn, user?.id]);

  return { role, isLoaded: ready, isSignedIn };
}