import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "@/lib/api";

function onDashboard() {
  const p = typeof window !== "undefined" ? window.location.pathname : "";
  return /^\/dashboard(\/|$)/.test(p);
}

export function useSyncOnAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { request } = useApi();
  const syncing = useRef(false);

  useEffect(() => {
    if (!onDashboard()) return;
    if (!isLoaded || !isSignedIn || !user || syncing.current) return;

    const key = `synced:${user.id}`;
    if (sessionStorage.getItem(key) === "1") return;

    const run = async () => {
      syncing.current = true;
      try {
        try {
          await request("/users/me");
          sessionStorage.setItem(key, "1");
          return;
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (!msg.includes("Not found")) throw e;
        }

        const pm = (user.publicMetadata || {}) as any;
        const role = pm.role === "artist" ? "artist" : "client";
        const profile = pm.profile || {};
        const baseUsername =
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
          user.username ||
          user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "user";

        const payload: any = {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          role,
          username: baseUsername,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          profile,
        };

        const syncOnce = () =>
          request("/users/sync", {
            method: "POST",
            body: JSON.stringify(payload),
          });

        try {
          await syncOnce();
          sessionStorage.setItem(key, "1");
        } catch (err: any) {
          const msg = String(err?.message || "");
          if (msg.includes("User already exists as")) {
            sessionStorage.setItem(key, "1");
            return;
          }
          if (
            msg.includes("username_required") ||
            msg.includes("duplicate key error") ||
            msg.includes("E11000")
          ) {
            payload.username = `${baseUsername}-${Math.random()
              .toString(36)
              .slice(2, 6)}`;
            await syncOnce();
            sessionStorage.setItem(key, "1");
            return;
          }
          throw err;
        }
      } finally {
        syncing.current = false;
      }
    };

    run();
  }, [isLoaded, isSignedIn, user, request]);
}