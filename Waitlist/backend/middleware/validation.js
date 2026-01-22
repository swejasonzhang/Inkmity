import { body, validationResult } from "express-validator";

// Input sanitization and validation
export const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        // Remove null bytes and control characters
        req.body[key] = req.body[key]
          .replace(/\0/g, "")
          .replace(/[\x00-\x1F\x7F]/g, "");
      }
    });
  }
  next();
};

// Validation rules for waitlist signup
export const validateWaitlistSignup = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 120 })
    .withMessage("Name must be between 1 and 120 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Name contains invalid characters")
    .customSanitizer((value) => {
      // Normalize whitespace
      return value.replace(/\s+/g, " ");
    }),
  
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage("Email is too long")
    .custom((value) => {
      // Block common disposable email domains
      const disposableDomains = [
        "tempmail.com",
        "throwaway.email",
        "guerrillamail.com",
        "10minutemail.com",
      ];
      const domain = value.split("@")[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        throw new Error("Disposable email addresses are not allowed");
      }
      return true;
    }),
];

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      details: errors.array(),
    });
  }
  next();
};

// Email validation helper
export const isValidEmail = (email) => {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Name validation helper
export const isValidName = (name) => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 120) return false;
  // Allow letters, spaces, hyphens, and apostrophes
  return /^[a-zA-Z\s'-]+$/.test(trimmed);
};
