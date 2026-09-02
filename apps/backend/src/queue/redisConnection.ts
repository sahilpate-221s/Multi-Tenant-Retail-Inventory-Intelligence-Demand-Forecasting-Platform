import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// BullMQ requires this specific option to be null, not undefined —
// without it, BullMQ throws at startup. This connection is shared
// across every queue and worker in the app.
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});