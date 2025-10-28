import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe, syncUser } from "@/api";

type Role = "client" | "artist";

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
          await getMe(token ?? "");
          return;
        } catch {}
        if (!user) return;
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
                location: "",
                shop: "",
                years: 0,
                baseRate: 0,
                bookingPreference: "open",
                travelFrequency: "rare",
                styles: [],
                bio: "",
              }
            : {
                budgetMin: 100,
                budgetMax: 200,
                location: "",
                placement: "",
                size: "",
                bio: "",
              };
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
        } catch {}
        try {
          await getMe(token ?? "");
        } catch {}
      } catch {}
    })();
  }, [isSignedIn, getToken, user]);
}