type Role = "client" | "artist";

type ClientProfile = {
  budgetMin: string;
  budgetMax: string;
  location: string;
  placement: string;
  size: string;
  notes: string;
};

type ArtistProfile = {
  location: string;
  shop: string;
  years: string;
  baseRate: string;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  instagram?: string;
  portfolio?: string;
  style?: string[];
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
  return {
    clerkId: args.clerkId,
    email: args.email,
    role: args.role,
    username,
    firstName: args.firstName,
    lastName: args.lastName,
    profile: args.profile,
  };
}