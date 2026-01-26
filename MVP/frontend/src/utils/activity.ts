export function formatActivityStatus(
  isOnline: boolean | undefined,
  lastActive: number | null | undefined
): string {
  if (isOnline) {
    return "Currently active";
  }

  if (!lastActive) {
    return "Never active";
  }

  const now = Date.now();
  const diffMs = now - lastActive;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `Last active ${diffMins} ${diffMins === 1 ? "min" : "mins"} ago`;
  } else if (diffHours < 24) {
    return `Last active ${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `Last active ${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else {
    const weeks = Math.floor(diffDays / 7);
    if (weeks < 4) {
      return `Last active ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `Last active ${months} ${months === 1 ? "month" : "months"} ago`;
    }
  }
}
