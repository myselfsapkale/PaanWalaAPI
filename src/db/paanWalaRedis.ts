import { createClientPool } from "redis";

// Creating redis pool with configuration
export const redisPool = createClientPool(
    {
        url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    },
    {
        minimum: Number(process.env.REDIS_CONNECTION_MINIMUM),
        maximum: Number(process.env.REDIS_CONNECTION_LIMIT),
    }
);

// Creating redis connection
export async function connectRedis(): Promise<void> {
    await redisPool.connect();
};
