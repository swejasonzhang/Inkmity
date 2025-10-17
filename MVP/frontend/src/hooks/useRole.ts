import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

export type AppRole = "client" | "artist";

export function useRole() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const r = (user?.publicMetadata?.role as AppRole | undefined) ?? null;
    setRole(r ?? null);
  }, [isLoaded, isSignedIn, user]);

  return { role, isSignedIn, isLoaded };
}