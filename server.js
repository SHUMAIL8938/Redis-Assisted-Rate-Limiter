import express from "express";
import { rateLimiter, initRateLimiter } from "./rateLimiter.js";

const app = express();
const PORT = 3000;
async function start() {
  await initRateLimiter();
  app.use(rateLimiter());
  app.get("/", (req, res) => res.send("Hello World"));
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
start();