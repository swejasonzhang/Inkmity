import rateLimit from "express-rate-limit";

const isDevelopment = process.env.NODE_ENV !== "production";

const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

const WINDOW_MS = num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);

export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: num(process.env.RATE_LIMIT_MAX, 1000),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
});

export const assistantLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: num(process.env.ASSISTANT_RATE_LIMIT_MAX, 30),
  message: "You're sending messages too quickly — please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
});

export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: num(process.env.AUTH_RATE_LIMIT_MAX, 5),
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isDevelopment,
});
