import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe, syncUser } from "@/api";

type Role = "client" | "artist";

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
        
        try {
          await getMe({ token: token ?? undefined, signal: ac.signal });
          return;
        } catch (e: any) {
          if (cancelled || ac.signal.aborted || e?.name === "AbortError") return;
        }
        
        if (cancelled || ac.signal.aborted || !user) return;
        
        const email =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          "";
        const role: Role =
          (user.publicMetadata?.role as Role | undefined) ?? "client";
        const fn = user.firstName?.trim() || "";
        const ln = user.lastName?.trim() || "";
        const username =
          `${fn} ${ln}`.trim() ||
          email.split("@")[0] ||
          `user-${user.id.slice(-6)}`;
        const profile =
          role === "artist"
            ? {
                location: "New York, NY",
                years: 0,
                baseRate: 100,
                bookingPreference: "open",
                travelFrequency: "rare",
                styles: [],
                bio: "",
              }
            : {
                budgetMin: 100,
                budgetMax: 200,
                location: "New York, NY",
                placement: "",
                size: "",
              };
        
        if (cancelled || ac.signal.aborted) return;
        
        try {
          await syncUser(token ?? "", {
            clerkId: user.id,
            email,
            role,
            username,
            firstName: fn,
            lastName: ln,
            profile,
          });
        } catch (e: any) {
          if (cancelled || ac.signal.aborted || e?.name === "AbortError") return;
        }
        
        if (cancelled || ac.signal.aborted) return;
        
        try {
          await getMe({ token: token ?? undefined, signal: ac.signal });
        } catch (e: any) {
          if (cancelled || ac.signal.aborted || e?.name === "AbortError") return;
        }
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
  }, [isSignedIn, user?.id]);
}