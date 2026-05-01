import redis from "./redisClient.js";
import crypto from "crypto";
const script = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local winStart = now - window
redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, winStart)
local count = redis.call("ZCARD", KEYS[1])
if count >= limit then
   return {0, count, 0}
end
redis.call("ZADD", KEYS[1], now, member)
redis.call("EXPIRE", KEYS[1], math.ceil(window / 1000))
local newCount = count + 1
local remaining = limit - newCount
return {1, newCount, remaining}
`;
const rateLimitConfig = {
  "/test": { window: 10000, limit: 3 },
  "/login": { window: 10000, limit: 3 },
};
const defaultConfig={window:10000,limit:3};
let sha;
export async function initRateLimiter() {
  try {
    sha = await redis.script("LOAD", script);
    console.log("Rate limiter script loaded");
  } catch (err) {
    console.error("Failed to load Lua :", err);
    throw err;
  }
}
async function checkRateLimit(userId, route, window, limit) {
  const now = Date.now();
  const unique = `${now}:${crypto.randomUUID()}`;
  const key = `rate:${userId}:${route}`;
  try {
    const result = await redis.evalsha(sha, 1, key, now, window, limit, unique);
    const [allowedFlag, count, remaining] = result;
    return {
      allowed: allowedFlag === 1,
      count,
      remaining,
    };
  } catch (err) {
    if (err.message.includes("NOSCRIPT")) {
      sha = await redis.script("LOAD", script);
      const result = await redis.evalsha(
        sha,
        1,
        key,
        now,
        window,
        limit,
        unique,
      );
      const [allowedFlag, count, remaining] = result;
      return {
        allowed: allowedFlag === 1,
        count,
        remaining,
      };
    }
    throw err;
  }
}
export function rateLimiter() {
  return async function (req, res, next) {
    try {
      const userId = req.ip;
      const routeConfig = Object.entries(rateLimitConfig).find(([route]) =>
        req.path.startsWith(route),
      )?.[1] || defaultConfig;
      const { window, limit } = routeConfig;
      const { allowed, remaining } = await checkRateLimit(
        userId,
        req.path,
        window,
        limit,
      );
     console.log({
  time: new Date().toISOString(),
  userId,
  route: req.path,
  allowed,
  remaining,
  limit
});
      res.set("X-RateLimit-Limit", limit.toString());
      res.set("X-RateLimit-Remaining", remaining.toString());
      if (!allowed) {
        return res
          .status(429)
          .set("Retry-After", Math.ceil(window / 1000).toString())
          .json({ message: "Too many requests" });
      }
      res.set("X-Server-Time", Date.now().toString());
      next();
    } catch (err) {
      console.error("Rate limiter error:", err);
      next();
    }
  };
}
