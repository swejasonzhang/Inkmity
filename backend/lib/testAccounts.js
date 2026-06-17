import { config } from "../config/index.js";

export function testClerkIds() {
  return config.test.clerkIds;
}

export function isTestAccount(clerkId) {
  return !!clerkId && testClerkIds().includes(String(clerkId));
}

// Mongo filter fragment that hides test accounts from a viewer.
// Empty (no filtering) when the viewer is itself a test account, or when no
// test accounts are configured — so test accounts see each other + the whole
// platform, but real users never see test accounts.
export function hideTestAccountsFilter(viewerClerkId) {
  const ids = testClerkIds();
  if (!ids.length || isTestAccount(viewerClerkId)) return {};
  return { clerkId: { $nin: ids } };
}

// True if `targetClerkId` must be hidden from `viewerClerkId`.
export function isHiddenFromViewer(targetClerkId, viewerClerkId) {
  return isTestAccount(targetClerkId) && !isTestAccount(viewerClerkId);
}
