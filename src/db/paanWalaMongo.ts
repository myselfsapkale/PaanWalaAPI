import { MongoClient, Db } from "mongodb";

// Create the MongoClient. The client itself manages the connection pool.
export const mongoClient = new MongoClient(
    String(process.env.MONGODB_URI),
    {
        minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE),
        maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE),
        maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIMEOUT), // 60 seconds idle timeout
        serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is down
    }
);

const dbName = process.env.MONGODB_DB_NAME;

// This async function is for checking whether MongoDB is connected or not
export async function connectMongoDB(): Promise<Db> {
    await mongoClient.connect();

    // Ping the database to verify the connection is active and responsive
    const db = mongoClient.db(dbName);
    await db.command({ ping: 1 });

    return db;
}