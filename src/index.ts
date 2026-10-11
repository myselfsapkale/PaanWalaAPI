import express from "express";

import "dotenv/config";

import router from "./router.ts";

import { connectDB } from "./db/paanWalaSQL.ts";

import { connectRedis } from "./db/paanWalaRedis.ts";

import { dependencies } from "./consts/dependencies.const.ts";

import { connectMongoDB } from "./db/paanWalaMongo.ts";

const app = express();

const port = process.env.PORT ?? "9001";

let server: ReturnType<typeof app.listen> | undefined;

let isShuttingDown = false;

app.use(router);

// Manually shutdown the server and dependencies Ex. MySQL Pool, Redis Connection
async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;

    isShuttingDown = true;
    console.log(`${signal}: shutting down application...`);

    try {
        // Stop HTTP server first
        if (server) {
            await new Promise<void>((resolve, reject) => {
                server!.close((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            console.log("HTTP server closed");
        }
    } catch (error) {
        console.error("HTTP server shutdown failed:", error);
        process.exitCode = 1;
    }

    // Close all dependencies, even if one fails
    for (const closeDependency of dependencies) {
        try {
            await closeDependency();
        } catch (error) {
            console.error("Dependency shutdown failed:", error);
            process.exitCode = 1;
        }
    }
}

// When we press Ctrl + C then it will be triggered
process.once("SIGINT", () => void shutdown("SIGINT"));

// When runtime our application is closing then it will be triggered
process.once("SIGTERM", () => void shutdown("SIGTERM"));

// Starting the server
async function startServer(): Promise<void> {
    try {
        await connectDB();
        console.log("MySQL connected successfully");

        await connectRedis();
        console.log("Redis connected successfully");

        await connectMongoDB();
        console.log("MongoDB connected successfully")

        server = app.listen(port, () => {
            console.log(`PaanWala app listening on port ${port}`);
        });

        server.on("error", (error: NodeJS.ErrnoException) => {
            console.error("HTTP server error:", error.message);
            process.exitCode = 1;
            void shutdown("SERVER_ERROR");
        });
    } catch (error) {
        console.error("Application startup failed:", error);

        // Clean up dependencies if startup fails
        await shutdown("STARTUP_FAILURE");
        process.exitCode = 1;
    }
}

void startServer();
