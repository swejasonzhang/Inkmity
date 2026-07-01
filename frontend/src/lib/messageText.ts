export const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;

export function extractUrls(text: string): string[] {
  return Array.from(
    new Set((String(text ?? "").match(urlRegex) || []).map((u) => u.replace(/[),.]+$/, "")))
  );
}

export function faviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return null;
  }
}

export type MessagePart = { type: "text" | "link"; value: string };

export function splitMessageParts(text: string): MessagePart[] {
  return String(text ?? "")
    .split(/(https?:\/\/[^\s]+)/g)
    .filter((p) => p.length > 0)
    .map((p) => ({ type: /^https?:\/\//.test(p) ? "link" : "text", value: p }));
}
