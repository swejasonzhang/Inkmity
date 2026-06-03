export type CachedRole = "client" | "artist";

const KEY = "inkmity-role";
const NAME_KEY = "inkmity-username";

export function getCachedRole(): CachedRole | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "client" || v === "artist" ? v : null;
  } catch {
    return null;
  }
}

export function setCachedRole(role: CachedRole): void {
  try {
    localStorage.setItem(KEY, role);
  } catch {
    
  }
}

export function getCachedUsername(): string | null {
  try {
    const v = localStorage.getItem(NAME_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function setCachedUsername(name: string): void {
  try {
    if (name && name.trim()) localStorage.setItem(NAME_KEY, name);
  } catch {
    
  }
}

export function clearCachedRole(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(NAME_KEY);
  } catch {
    
  }
}
