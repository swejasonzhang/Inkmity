// Serialize data for a <script type="application/ld+json"> block. JSON.stringify
// does NOT escape "</script>" or "<", so user-controlled values (e.g. an artist
// bio) could break out of the script element. Escaping < > & prevents that.
export function jsonLdSafe(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
