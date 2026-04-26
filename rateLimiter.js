import redis from "./redisClient.js";
const script = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, now-window)
local count = redis.call("ZCARD", KEYS[1])

if count >= limit then
  return {0, count}
end

redis.call("ZADD", KEYS[1], now, member)
redis.call("EXPIRE", KEYS[1], math.ceil(window/1000))
return {1, count+1}
`;

let sha;
export async function initRateLimiter() {
  sha = await redis.script("LOAD", script);
}

export function rateLimiter() {
  return async function (req, res, next) {
    const key = `rate:${req.ip}:${req.path}`;
    const now = Date.now();
    const result = await redis.evalsha(sha, 1, key, now, 10000, 3, `${now}`);
    if (result[0] === 0) {
      return res.status(429).send("Too many requests");
    }
    next();
  };
}