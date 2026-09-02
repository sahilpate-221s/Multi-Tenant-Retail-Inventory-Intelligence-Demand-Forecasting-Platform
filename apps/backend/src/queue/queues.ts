import { Queue } from "bullmq";
import { redisConnection } from "./redisConnection";

export const csvImportQueue = new Queue("csv-import", { connection: redisConnection });