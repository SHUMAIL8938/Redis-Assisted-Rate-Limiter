import express from "express";
import { rateLimiter, initRateLimiter } from "./rateLimiter.js";

const app = express();
const PORT = 3000;
async function start() {
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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
start();
