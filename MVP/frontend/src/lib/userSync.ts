type Role = "client" | "artist";

export type ClientProfile = {
  budgetMin: string | number;
  budgetMax: string | number;
  location: string;
  placement: string;
  size: string;
  availability?: string;
  style?: string;
};

export type ArtistProfile = {
  location: string;
  shop: string;
  years: string | number;
  baseRate: string | number;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  styles?: string[];
  bio?: string;
};

export function buildSyncPayload(args: {
  clerkId: string;
  email: string;
  role: Role;
  username?: string;
  firstName?: string;
  lastName?: string;
  profile: ClientProfile | ArtistProfile;
}) {
  const username =
    `${args.firstName ?? ""} ${args.lastName ?? ""}`.trim() ||
    args.username ||
    "";

  if (args.role === "client") {
    const p = args.profile as ClientProfile;
    const budgetMin = Number(p.budgetMin ?? 100);
    const budgetMax = Number(p.budgetMax ?? 200);
    return {
      clerkId: args.clerkId,
      email: args.email,
      role: args.role,
      username,
      firstName: args.firstName,
      lastName: args.lastName,
      profile: {
        budgetMin,
        budgetMax,
        location: p.location || "",
        placement: p.placement || "",
        size: p.size || "",
      },
    };
  }

  const p = args.profile as ArtistProfile;
  return {
    clerkId: args.clerkId,
    email: args.email,
    role: args.role,
    username,
    firstName: args.firstName,
    lastName: args.lastName,
    profile: {
      location: p.location || "",
      shop: p.shop || "",
      years: Number(p.years ?? 0),
      baseRate: Number(p.baseRate ?? 0),
      bookingPreference: p.bookingPreference || "open",
      travelFrequency: p.travelFrequency || "rare",
      styles: Array.isArray(p.styles) ? p.styles : [],
      bio: p.bio || "",
    },
  };
}
