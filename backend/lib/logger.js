import pino from "pino";

const isProd = (process.env.NODE_ENV || "development") === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["stripe-signature"]',
      "req.body.password",
      "req.body.token",
    ],
    remove: true,
  },
  base: { service: "inkmity-api" },
});
