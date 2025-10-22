import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { apiGet } from "@/lib/api";

export function useRole() {
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [role, setRole] = useState<"client" | "artist" | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!clerkLoaded) return;
      if (!isSignedIn) {
        if (active) {
          setRole(null);
          setLoaded(true);
        }
        return;
      }
      try {
        const token = await getToken();
        const me = await apiGet<any>(
          "/users/me",
          undefined,
          token ?? undefined
        );
        if (active) setRole(me?.role === "artist" ? "artist" : "client");
      } catch {
        const pm = (user?.publicMetadata || {}) as any;
        const r = pm.role === "artist" ? "artist" : "client";
        if (active) setRole(r);
      } finally {
        if (active) setLoaded(true);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [clerkLoaded, isSignedIn, getToken, user]);

  return { role, isLoaded: loaded, isSignedIn };
}