import { clerkClient } from "@clerk/express";

const DEV_TEST_EMAILS = {
  client: "testclient@inkmity.dev",
  artist: "testartist@inkmity.dev",
};

export const devSignInToken = async (req, res) => {
  if (!/^sk_test/.test(process.env.CLERK_SECRET_KEY || "")) {
    return res.status(403).json({ error: "Disabled outside the dev/test instance" });
  }
  const role = String(req.body?.role || "").toLowerCase();
  const email = DEV_TEST_EMAILS[role];
  if (!email) return res.status(400).json({ error: "role must be 'client' or 'artist'" });
  try {
    const { data } = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
    const user = data?.[0];
    if (!user) return res.status(404).json({ error: `Test ${role} not seeded. Run scripts/seedTestAuthUsers.js` });
    const ticket = await clerkClient.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });
    return res.json({ token: ticket.token });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Failed to create sign-in token" });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ error: "Missing email" });
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    return res.json({ exists: (users?.length ?? 0) > 0 });
  } catch {
    return res.status(500).json({ error: "Internal error" });
  }
};