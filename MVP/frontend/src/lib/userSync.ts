type Role = "client" | "artist";

export function suggestUsername(
  firstName?: string,
  lastName?: string,
  email?: string
) {
  const source =
    firstName && lastName
      ? `${firstName}-${lastName}`
      : email?.split("@")[0] ?? "user";
  return (
    source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 24) || "user"
  );
}

export function buildSyncPayload(args: {
  clerkId: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  profile?: any;
  username?: string;
}) {
  const { clerkId, email, role, firstName, lastName, profile, username } = args;

  let normalizedProfile = profile;
  if (role === "client" && profile) {
    const minNum = Math.max(
      0,
      Math.min(5000, Number(profile.budgetMin ?? 100))
    );
    const maxNum = Math.max(
      0,
      Math.min(5000, Number(profile.budgetMax ?? 200))
    );
    const mm =
      maxNum > minNum ? { min: minNum, max: maxNum } : { min: 100, max: 200 };
    normalizedProfile = {
      ...profile,
      budgetMin: String(mm.min),
      budgetMax: String(mm.max),
    };
  }

  return {
    clerkId,
    email,
    role,
    firstName,
    lastName,
    username: username || suggestUsername(firstName, lastName, email),
    profile: normalizedProfile,
  };
}