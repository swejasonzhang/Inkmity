export function displayNameFromUsername(u?: string): string {
  if (!u) return "";
  return u
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}