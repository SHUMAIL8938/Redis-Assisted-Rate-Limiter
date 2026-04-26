import redis from "./redisClient.js";
export function rateLimiter() {
  return async function (req, res, next) {
    const key = `rate:${req.ip}:${req.path}`;
    const now = Date.now();
    const window = 10000;
    const limit = 3;
    await redis.zremrangebyscore(key, 0, now - window);
    const count = await redis.zcard(key);
    if (count >= limit) {
      return res.status(429).send("Too many requests");
    }
    await redis.zadd(key, now, `${now}`);
    await redis.expire(key, 10);
    next();
  };
}