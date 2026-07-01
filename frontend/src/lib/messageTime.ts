export function formatMessageTime(ts: number): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function formatMessageDateTime(ts: number | string | undefined): string {
  try {
    if (!ts) return "";
    const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
    if (isNaN(d.getTime())) return "";
    const dateStr = d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return "";
  }
}
