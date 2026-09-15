import rateLimit from "express-rate-limit";
import { fail } from "../utils/apiResponse";

/**
 * General ceiling for all API traffic - generous enough that no real user
 * of the app (browsing products, placing a few orders a day) ever comes
 * close, but stops a single client from hammering the server.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => fail(res, "Too many requests. Please slow down and try again shortly.", 429),
});

/**
 * Login endpoints are the highest-value target for abuse: Shop ID + a short
 * numeric PIN is convenient for shop owners but brute-forceable without a
 * strict limiter here. This caps attempts per IP independently of the
 * general API limiter.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => fail(res, "Too many login attempts. Please try again in a few minutes.", 429),
});

/**
 * Order placement is idempotency-protected against accidental duplicates,
 * but this guards against a scripted burst of distinct fake orders from one
 * source while staying well above any real shop's daily order volume.
 */
export const orderCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => fail(res, "Too many orders submitted. Please try again shortly.", 429),
});
