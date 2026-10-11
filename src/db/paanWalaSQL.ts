import mysql from 'mysql2/promise';

// Create the connection pool. The pool-specific settings are the defaults
export const pool = mysql.createPool({
    host: String(process.env.MYSQL_HOST),
    user: String(process.env.MYSQL_USERNAME),
    password: String(process.env.MYSQL_PASSWORD),
    database: String(process.env.MYSQL_DATABASE),
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT),
    maxIdle: Number(process.env.MYSQL_MAX_IDLE_CONNECTION), // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: Number(process.env.MYSQL_MAX_IDLE_TIMEOUT), // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: Number(process.env.MAX_QUEUE_LIMIT),
    enableKeepAlive: true,
    keepAliveInitialDelay: Number(process.env.MYSQL_KEEP_ALIVE_INITIAL_DELAY),
});

// This async function is for checking whether mysql is connected or not
export async function connectDB(): Promise<void> {
    let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined;

    try {
        connection = await pool.getConnection();
        await connection.ping();
    } catch (error: unknown) {
        throw error;
    } finally {
        connection?.release();
    }
}
