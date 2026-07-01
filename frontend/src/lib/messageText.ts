export const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;

export function extractUrls(text: string): string[] {
  return Array.from(
    new Set((String(text ?? "").match(urlRegex) || []).map((u) => u.replace(/[),.]+$/, "")))
  );
}

const faviconCache = new Map<string, string | null>();

export function faviconUrl(url: string): string | null {
  const hit = faviconCache.get(url);
  if (hit !== undefined) return hit;
  let result: string | null;
  try {
    result = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
  } catch {
    result = null;
  }
  faviconCache.set(url, result);
  return result;
}

export type MessagePart = { type: "text" | "link"; value: string };

export function splitMessageParts(text: string): MessagePart[] {
  return String(text ?? "")
    .split(/(https?:\/\/[^\s]+)/g)
    .filter((p) => p.length > 0)
    .map((p) => ({ type: /^https?:\/\//.test(p) ? "link" : "text", value: p }));
}
