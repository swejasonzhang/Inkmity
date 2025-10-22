import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { apiGet } from "@/lib/api";

function onDashboard() {
  const p = typeof window !== "undefined" ? window.location.pathname : "";
  return /^\/dashboard(\/|$)/.test(p);
}

export function useRole() {
  const { isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<"client" | "artist" | null>(null);

  useEffect(() => {
    if (!onDashboard()) return;
    if (!isLoaded || !isSignedIn) return;
    const run = async () => {
      try {
        const me = await apiGet<{ role: "client" | "artist" }>("/users/me");
        setRole(me.role);
      } catch {
        setRole(null);
      }
    };
    run();
  }, [isLoaded, isSignedIn]);

  return { role, isLoaded, isSignedIn };
}