import express from "express";
import { rateLimiter, initRateLimiter } from "./rateLimiter.js";
import redis from "./redisClient.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));
app.set("trust proxy", true);
async function startServer() {
  await initRateLimiter();
  app.use(rateLimiter());
  app.get("/", (req, res) => res.send("Hello World"));
  app.get("/test", (req, res) => res.send("req successful"));
  app.get("/login", (req, res) => res.send("login successful"));
  app.get("/debug/:route", async (req, res) => {
    const key = `rl:${req.ip}:${req.params.route}`;
    const data = await redis.zrange(key, 0, -1, "WITHSCORES");
    res.json({ key, entries: data });
  });
  app.get("/health", (req, res) => {
    res.json({ status: "ok", time: Date.now() });
  });
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
startServer();