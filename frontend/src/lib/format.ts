const SMALL_WORDS = new Set(["and", "or", "the", "of", "a", "an"]);

export function titleCase(s?: string): string {
  if (!s) return "";
  const out = s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && SMALL_WORDS.has(w) ? w : w.replace(/(^|-)([a-z])/g, (_, p, c) => p + c.toUpperCase())
    )
    .join(" ");
  return out.replace(/^([a-z])/, (c) => c.toUpperCase());
}

export function displayNameFromUsername(u?: string): string {
  if (!u) return "";
  return u
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}