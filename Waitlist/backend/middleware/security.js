import rateLimit from "express-rate-limit";

// Rate limiting for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/healthz";
  },
});

// Stricter rate limiting for POST endpoints
export const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 POST requests per windowMs
  message: "Too many signup attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Rate limiting for waitlist signups specifically
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 signups per hour
  message: "Too many signup attempts from this IP, please try again in an hour.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );
  
  // Remove X-Powered-By header
  res.removeHeader("X-Powered-By");
  
  next();
};

// Request size validation
export const validateRequestSize = (req, res, next) => {
  const contentLength = req.get("content-length");
  const maxSize = 256 * 1024; // 256KB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      error: "Request payload too large",
    });
  }
  
  next();
};

// IP validation and blocking
const blockedIPs = new Set(); // In production, use Redis or database

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
