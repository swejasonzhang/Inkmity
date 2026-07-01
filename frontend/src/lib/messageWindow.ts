export const MESSAGE_WINDOW = 60;

export type MessageWindow<T> = { shown: T[]; earlierCount: number };

export function windowMessages<T>(messages: T[], visibleCount: number): MessageWindow<T> {
  const list = Array.isArray(messages) ? messages : [];
  const n = Math.max(1, Math.floor(visibleCount) || MESSAGE_WINDOW);
  if (list.length <= n) return { shown: list, earlierCount: 0 };
  return { shown: list.slice(list.length - n), earlierCount: list.length - n };
}
