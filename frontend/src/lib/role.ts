export type Role = "client" | "artist" | "studio";

const ROLES: readonly Role[] = ["client", "artist", "studio"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function resolveRole(apiRole: unknown, metadataRole: unknown): Role {
  if (isRole(apiRole)) return apiRole;
  return metadataRole === "artist" || metadataRole === "studio" ? metadataRole : "client";
}
