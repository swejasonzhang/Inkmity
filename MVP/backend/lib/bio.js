export const bioText = (username, bio) =>
  (typeof bio === "string" && bio.trim()) ||
  `Nice to meet you, I'm ${
    username || "this artist"
  }, let's talk about your next tattoo.`;

export const cleanBio = (s) =>
  typeof s === "string"
    ? s.trim().replace(/\s+/g, " ").slice(0, 600)
    : undefined;