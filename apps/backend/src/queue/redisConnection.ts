import IORedis from "ioredis";
import { logger } from "../lib/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// BullMQ requires maxRetriesPerRequest to be null
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
    return targetErrors.some((target) => err.message.includes(target));
  },
});

redisConnection.on("error", (err) => {
  logger.error({ error: err.message }, "[Redis] Connection error");
});

redisConnection.on("connect", () => {
  logger.info("[Redis] Connected successfully.");
});