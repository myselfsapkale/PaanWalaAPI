import { pool } from "../db/paanWalaSQL.ts";

import { redisPool } from "../db/paanWalaRedis.ts";

// When server will close then we will remove below dependencies
export const dependencies = [
    async () => {
        await pool.end();
        console.log("MySQL pool closed");
    },

    async () => {
        await redisPool.close();
        console.log("Redis pool is closed");
    },
    
    // Add other dependency cleanup functions here.
    // Example: Redis, message queues, background workers.
];
