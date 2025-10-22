export type Role = "client" | "artist";

export type ClientForm = {
  budgetMin: string;
  budgetMax: string;
  location: string;
  placement: string;
  size: string;
  style?: string;
  availability?: string;
};

export type ArtistForm = {
  location: string;
  shop: string;
  years: string;
  baseRate: string;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  styles?: string[];
};

const toNum = (v?: string) => (v ? Number(v) : undefined);

export function mapClientForm(f: ClientForm) {
  return {
    budgetMin: toNum(f.budgetMin),
    budgetMax: toNum(f.budgetMax),
    location: f.location || undefined,
    placement: f.placement || undefined,
    size: f.size || undefined,
  };
}

export function mapArtistForm(f: ArtistForm) {
  return {
    location: f.location || undefined,
    shop: f.shop || undefined,
    styles: f.styles && f.styles.length ? f.styles : undefined,
    yearsExperience: toNum(f.years),
    baseRate: toNum(f.baseRate),
    bookingPreference: f.bookingPreference || undefined,
    travelFrequency: f.travelFrequency || undefined,
  };
}

export function buildSyncPayload(args: {
  clerkId: string;
  email: string;
  role: Role;
  username?: string;
  firstName?: string;
  lastName?: string;
  profile: ReturnType<typeof mapClientForm> | ReturnType<typeof mapArtistForm>;
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
    ...(args.profile as object),
  };
}