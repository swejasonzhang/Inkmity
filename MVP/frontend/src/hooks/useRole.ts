import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe } from "@/api";

type Role = "client" | "artist";

export function useRole() {
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();
  const [role, setRole] = useState<Role>("client");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) {
      setRole("client");
      setReady(true);
      console.log("useRole: not signed in. role=client");
      return;
    }
    (async () => {
      let computed: Role = "client";
      try {
        const token = await getToken();
        const me = await getMe(token ?? "");
        const r =
          me?.role === "artist"
            ? "artist"
            : me?.role === "client"
            ? "client"
            : null;
        if (r) {
          computed = r;
          setRole(r);
        } else {
          const md = (user?.publicMetadata?.role as string | undefined) || "";
          computed = md === "artist" ? "artist" : "client";
          setRole(computed);
        }
      } catch {
        const md = (user?.publicMetadata?.role as string | undefined) || "";
        computed = md === "artist" ? "artist" : "client";
        setRole(computed);
      } finally {
        setReady(true);
        console.log("useRole: resolved role", computed);
      }
    })();
  }, [clerkLoaded, isSignedIn, user?.id, getToken, user?.publicMetadata?.role]);

  return { role, isLoaded: ready, isSignedIn };
}