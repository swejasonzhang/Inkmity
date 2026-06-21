import { config } from "../config/index.js";

export function testClerkIds() {
  return config.test.clerkIds;
}

export function isTestAccount(clerkId) {
  return !!clerkId && testClerkIds().includes(String(clerkId));
}

export function hideTestAccountsFilter(viewerClerkId) {
  const ids = testClerkIds();
  if (!ids.length || isTestAccount(viewerClerkId)) return {};
  return { clerkId: { $nin: ids } };
}

export function isHiddenFromViewer(targetClerkId, viewerClerkId) {
  return isTestAccount(targetClerkId) && !isTestAccount(viewerClerkId);
}
