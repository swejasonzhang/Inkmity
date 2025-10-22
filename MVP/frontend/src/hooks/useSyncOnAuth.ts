import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  buildSyncPayload,
  mapClientForm,
  mapArtistForm,
  Role,
} from "@/lib/userSync";
import { useApi } from "@/lib/api";

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
      } catch (e: any) {
        if (String(e.message).includes("404")) {
          const pm = (user.publicMetadata || {}) as any;
          const role: Role = pm.role === "artist" ? "artist" : "client";
          const profile =
            role === "artist"
              ? mapArtistForm(pm.profile || {})
              : mapClientForm(pm.profile || {});
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
        }
      } finally {
        syncing.current = false;
      }
    };

    run();
  }, [isLoaded, isSignedIn, user, request]);
}