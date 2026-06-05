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

        // Only verify whether an account already exists. Do NOT auto-create
        // one here: accounts are provisioned when the user finishes onboarding
        // (Signup / Onboarding flows). Auto-creating on auth would mint a
        // half-formed account (e.g. for fresh Google SSO sign-ups) before the
        // user has chosen a role/username, and would unlock the nav prematurely.
        await getMe({ token: token ?? undefined, signal: ac.signal });
      } catch (e: any) {
        if (cancelled || ac.signal.aborted || e?.name === "AbortError") return;
        // No account yet — leave the user unprovisioned so they are routed to
        // onboarding and the nav stays locked until onboarding completes.
        if (ranRef.current === user.id) {
          ranRef.current = null;
        }
      }
    })();
    
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [isSignedIn, user?.id]);
}