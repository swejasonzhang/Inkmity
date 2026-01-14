export const mockAuth = (userId = "test-user-id") => {
  return {
    user: { clerkId: userId },
    auth: { userId },
  };
};

export const mockRequireAuth = (req, res, next) => {
  req.user = { clerkId: "test-user-id" };
  req.auth = { userId: "test-user-id" };
  next();
};