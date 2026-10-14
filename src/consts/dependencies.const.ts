import { pool } from "../db/paanWalaSQL.ts";

import { redisPool } from "../db/paanWalaRedis.ts";

import { mongoClient } from "../db/paanWalaMongo.ts";

import logger from "../utils/elkLogger.util.ts";

// When server will close then we will remove below dependencies
export const dependencies = [
    async () => {
        await pool.end();
        console.log("MySQL pool closed");
    },

    async () => {
        await redisPool.close();
        console.log("Redis pool closed");
    },

    async () => {
        await mongoClient.close();
        console.log("MongoDB connection pool closed.");
    },

    async () => {
        await logger.closeLogstash();
        console.log("Logger connection closed.");
    },
];
