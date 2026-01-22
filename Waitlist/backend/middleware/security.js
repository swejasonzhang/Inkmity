import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === "/healthz";
  },
});

export const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many signup attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many signup attempts from this IP, please try again in an hour.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );
  res.removeHeader("X-Powered-By");
  next();
};

export const validateRequestSize = (req, res, next) => {
  const contentLength = req.get("content-length");
  const maxSize = 256 * 1024;
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      error: "Request payload too large",
    });
  }
  
  next();
};

const blockedIPs = new Set();

export const ipFilter = (req, res, next) => {
  const clientIP =
    req.ip ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection.remoteAddress;
  
  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({
      error: "Access denied",
    });
  }
  
  req.clientIP = clientIP;
  next();
};
