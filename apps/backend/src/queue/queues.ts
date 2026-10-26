import { Queue, JobsOptions } from "bullmq";
import { redisConnection } from "./redisConnection";

export const defaultReliableJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: {
    count: 200,
  },
  removeOnFail: false, // Retain failed jobs in Dead Letter state for debugging & manual replay
};

export const csvImportQueue = new Queue("csv-import", {
  connection: redisConnection,
  defaultJobOptions: defaultReliableJobOptions,
});