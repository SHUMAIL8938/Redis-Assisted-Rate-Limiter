import redis from "./redisClient.js";
import crypto from "crypto";

const script = `...`;
const rateLimitConfig = {
  "/test": { window: 10000, limit: 3 },
  "/login": { window: 10000, limit: 3 }
};
const defaultConfig = { window: 10000, limit: 3 };
let sha;
export async function initRateLimiter() {
  sha = await redis.script("LOAD", script);
}
export function rateLimiter() {
  return async function (req, res, next) {
    const routeConfig = Object.entries(rateLimitConfig).find(([route]) =>
      req.path.startsWith(route)
    )?.[1] || defaultConfig;
    const { window, limit } = routeConfig;
    const key = `rate:${req.ip}:${req.path}`;
    const now = Date.now();
    const unique = `${now}:${crypto.randomUUID()}`;
    const [allowedFlag, count] = await redis.evalsha(sha, 1, key, now, window, limit, unique);
    const remaining = limit - count;
    res.set("X-RateLimit-Limit", limit.toString());
    res.set("X-RateLimit-Remaining", remaining.toString());

    if (allowedFlag === 0) {
      return res.status(429)
        .set("Retry-After", Math.ceil(window / 1000).toString())
        .json({ message: "Too many requests" });
    }
    next();
  };
}