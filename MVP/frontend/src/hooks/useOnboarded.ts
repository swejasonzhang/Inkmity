import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe } from "@/api";

let cachedOnboardedUserId: string | null = null;

export function useOnboarded() {
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();
  const uid = user?.id ?? null;
  const [onboarded, setOnboarded] = useState<boolean | null>(
    uid && cachedOnboardedUserId === uid ? true : null
  );

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) {
      setOnboarded(null);
      return;
    }
    if (uid && cachedOnboardedUserId === uid) {
      setOnboarded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const me = await getMe({ token: token ?? undefined });
        if (cancelled) return;
        const ok = Boolean(me?._id);
        if (ok && uid) cachedOnboardedUserId = uid;
        setOnboarded(ok);
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { status?: number })?.status;
        setOnboarded(status === 404 ? false : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, uid, getToken]);

  return { onboarded, clerkLoaded };
}

export function markOnboarded(userId: string) {
  cachedOnboardedUserId = userId;
}
