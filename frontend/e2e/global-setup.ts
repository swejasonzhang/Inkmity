// Only initializes Clerk's Playwright testing token when credentials/keys are
// configured, so the public responsive run works with no extra setup.
export default async function globalSetup() {
  const hasCreds =
    process.env.CLERK_SECRET_KEY ||
    process.env.E2E_CLIENT_EMAIL ||
    process.env.E2E_ARTIST_EMAIL;
  if (!hasCreds) return;
  const { clerkSetup } = await import("@clerk/testing/playwright");
  await clerkSetup();
}
