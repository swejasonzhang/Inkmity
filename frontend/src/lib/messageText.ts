// Pure message-text helpers extracted from ChatWindow so link detection and
// rendering segmentation can be tested (and reused) without the chat shell.

export const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;

/** Unique URLs found in a message, with trailing punctuation stripped. */
export function extractUrls(text: string): string[] {
  return Array.from(
    new Set((String(text ?? "").match(urlRegex) || []).map((u) => u.replace(/[),.]+$/, "")))
  );
}

/** A favicon URL for the link's domain, or null if the URL can't be parsed. */
export function faviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return null;
  }
}

export type MessagePart = { type: "text" | "link"; value: string };

/** Splits message text into ordered text/link segments for rendering. */
export function splitMessageParts(text: string): MessagePart[] {
  return String(text ?? "")
    .split(/(https?:\/\/[^\s]+)/g)
    .filter((p) => p.length > 0)
    .map((p) => ({ type: /^https?:\/\//.test(p) ? "link" : "text", value: p }));
}
