import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe } from "@/api";

export function useSyncOnAuth() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const ranRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    if (ranRef.current === user.id) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const ac = abortControllerRef.current;

    ranRef.current = user.id;
    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        if (cancelled || ac.signal.aborted) return;

        await getMe({ token: token ?? undefined, signal: ac.signal });
      } catch (e: any) {
        if (cancelled || ac.signal.aborted || e?.name === "AbortError") return;
        if (ranRef.current === user.id) {
          ranRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [isSignedIn, user?.id, getToken]);
}