export type Role = "client" | "artist" | "studio";

const ROLES: readonly Role[] = ["client", "artist", "studio"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Resolve a user's effective role. The API's role wins when it's a known role
 * (including "client"); otherwise we fall back to the role Clerk carries in
 * publicMetadata — but only "artist"/"studio" are honoured there, since
 * "client" is the safe default for anything unrecognized.
 */
export function resolveRole(apiRole: unknown, metadataRole: unknown): Role {
  if (isRole(apiRole)) return apiRole;
  return metadataRole === "artist" || metadataRole === "studio" ? metadataRole : "client";
}
