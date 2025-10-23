import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { apiGet, apiPost } from "@/lib/api";

export function useSyncOnAuth() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const token = await getToken();

        try {
          await apiGet("/users/me", undefined, token || undefined);
          return;
        } catch (e: any) {
          if (e?.status !== 404) return;
        }

        if (!user) return;

        const email =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          "";

        const role =
          (user.publicMetadata?.role as "client" | "artist" | undefined) ||
          "client";

        const fn = user.firstName?.trim() || "";
        const ln = user.lastName?.trim() || "";

        const username =
          `${fn} ${ln}`.trim() ||
          email.split("@")[0] ||
          `user-${user.id.slice(-6)}`;

        const profile =
          role === "artist"
            ? {
                location: "",
                shop: "",
                years: 0,
                baseRate: 0,
                bookingPreference: "open",
                travelFrequency: "rare",
                styles: [],
              }
            : {
                budgetMin: 100,
                budgetMax: 200,
                location: "",
                placement: "",
                size: "",
              };

        try {
          await apiPost(
            "/users/sync",
            {
              clerkId: user.id,
              email,
              role,
              username,
              firstName: fn,
              lastName: ln,
              profile,
            },
            token || undefined
          );
        } catch (e: any) {
          if (e?.status !== 409) return;
        }

        try {
          await apiGet("/users/me", undefined, token || undefined);
        } catch {}
      } catch {}
    })();
  }, [isSignedIn, getToken, user]);
}