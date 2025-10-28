const RESERVED = new Set([
  "admin",
  "root",
  "support",
  "inkmity",
  "system",
  "about",
  "contact",
  "api",
  "assets",
  "static",
  "dashboard",
  "login",
  "signup",
  "settings",
  "me",
  "profile",
  "users",
]);

export function slugifyBase(s) {
  return (
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9._]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 30) || "user"
  );
}

export function isValidHandle(h) {
  return /^[a-z0-9._]{3,30}$/.test(h) && !RESERVED.has(h);
}

export async function ensureUniqueHandle(db, desired) {
  let base = slugifyBase(desired);
  if (!isValidHandle(base)) base = "user";
  let candidate = base;
  let i = 1;
  while (
    await db
      .collection("users")
      .findOne({ handle: candidate }, { projection: { _id: 1 } })
  ) {
    candidate = `${base}.${i++}`.slice(0, 30);
  }
  return candidate;
}