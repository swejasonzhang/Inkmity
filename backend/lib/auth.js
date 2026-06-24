export function getActorId(req) {
  return String(
    req?.user?.clerkId || req?.auth?.userId || req?.user?._id || req?.user?.id || ""
  ).trim();
}
