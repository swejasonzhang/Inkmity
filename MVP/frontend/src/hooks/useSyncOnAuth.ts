import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "@/lib/api";
import { buildSyncPayload, ClientProfile, ArtistProfile } from "@/lib/userSync";

type Role = "client" | "artist";

export function useSyncOnAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { request } = useApi();
  const syncing = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || syncing.current) return;

    const run = async () => {
      syncing.current = true;
      try {
        await request("/users/me");
        return;
      } catch (e: any) {
        const status = Number(e?.status || 0);
        if (status !== 404) {
          console.error("useSyncOnAuth /me failed:", e);
          return;
        }
      }

      try {
        const pm = (user.publicMetadata || {}) as any;
        const role: Role = pm.role === "artist" ? "artist" : "client";
        const profile = (pm.profile || {}) as ClientProfile | ArtistProfile;

        const payload = buildSyncPayload({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          role,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          username: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          profile,
        });

        await request("/users/sync", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        await request("/users/me");
      } catch (e) {
        console.error("useSyncOnAuth sync failed:", e);
      } finally {
        syncing.current = false;
      }
    };

    run();
  }, [isLoaded, isSignedIn, user, request]);
}
