import rateLimit from "express-rate-limit";

/**
 * Global API limiter. Deliberately generous — this is an internal facility app where many
 * users can share one office IP, so the ceiling is set to stop a runaway/looping client
 * (which would fire thousands of requests a minute) without throttling normal use.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1000, // requests per IP per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please slow down and try again shortly." },
});

/**
 * Tighter limiter reserved for authentication endpoints when they arrive (there is no auth
 * today). Kept here so wiring it up later is a one-line change, not a new dependency.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Too many attempts, please try again later." },
});
