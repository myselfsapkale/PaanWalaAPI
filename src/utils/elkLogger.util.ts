import { createLogger, format, transports, Logger } from 'winston';

import TransportStream, { type TransportStreamOptions } from 'winston-transport';

import net from 'net';

import os from 'os';

import type { Request } from 'express';

interface LogInfo {
    level: string;
    message: string;
    timestamp?: string;
    stack?: string;
    meta?: Record<string, unknown>;
    [key: string]: unknown;
}

interface LogstashTransportOptions extends TransportStreamOptions {
    host: string;
    port: number;
}

interface RequestInfo {
    token_user_id: string;
    token_user_type: string;
    correlation_id: string;
    target: string;
    ip: string;
    method: string;
}

const hostname = os.hostname();

// Custom Winston transport sending logs over TCP to Logstash
class LogstashTcpTransport extends TransportStream {
    private socket: net.Socket;
    private host: string;
    private port: number;
    private connected = false;
    private buffer: string[] = [];
    private reconnectTimer?: NodeJS.Timeout;
    private isExplicitlyClosed = false;

    constructor(opts: LogstashTransportOptions) {
        super(opts);
        this.host = opts.host;
        this.port = opts.port;
        this.socket = new net.Socket();

        this.initSocket();
    }

    private initSocket(): void {
        if (this.isExplicitlyClosed) return;
        this.socket.connect(this.port, this.host);

        this.socket.on('connect', () => {
            this.connected = true;
            while (this.buffer.length > 0) {
                const chunk = this.buffer.shift();
                if (chunk) {
                    this.socket.write(chunk);
                }
            }
        });

        this.socket.on('error', (err: Error) => {
            this.connected = false;
            // Suppress error log if explicitly closing down
            if (!this.isExplicitlyClosed) {
                console.error('DEBUG: Logstash connection error:', err.message);
            }
        });

        this.socket.on('close', () => {
            this.connected = false;

            if (!this.isExplicitlyClosed) {
                console.log('DEBUG: Logstash connection closed, reconnecting in 5s...');
                this.reconnectTimer = setTimeout(() => {
                    this.initSocket();
                }, 5000);
            }
        });
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public async close(): Promise<void> {
        this.isExplicitlyClosed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        return new Promise((resolve) => {
            this.socket.end(() => {
                this.socket.destroy();
                this.connected = false;
                resolve();
            });
        });
    }

    override log(info: LogInfo, callback: () => void): void {
        setImmediate(() => this.emit('logged', info));

        const meta = (info.meta as Record<string, unknown>) || {};

        const logEntry = {
            message: info.message,
            severity: (info.level || 'info').toString().toUpperCase(),
            hostname,
            ip: meta.ip ?? '0.0.0.0',
            correlation_id: meta.correlation_id ?? 'N/A',
            timestamp: info.timestamp || new Date().toISOString(),
            token_user_id: meta.token_user_id ?? 'anonymous',
            token_user_type: meta.token_user_type ?? 'anonymous',
            target_path: meta.target ?? 'N/A',
            method: meta.method ?? 'N/A',
            ...(info.stack && { stack: info.stack })
        };

        const json = JSON.stringify(logEntry) + '\n';

        if (this.connected) {
            this.socket.write(json);
        } else {
            if (this.buffer.length < 1000) {
                this.buffer.push(json);
            }
        }

        callback();
    }
}

// Instantiate the transport so we can reference it for health checks and closing
const logstashTransport = new LogstashTcpTransport({
    host: process.env.LOGSTASH_HOST || 'localhost',
    port: Number(process.env.LOGSTASH_PORT) || 5044
});

// Winston logger instance configuration
const logger: Logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        logstashTransport,
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        })
    ],
});

// Async function to check whether Logstash is connected or not (analogous to connectDB)
export async function connectLogstash(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (logstashTransport.isConnected()) {
            return resolve();
        }
        // Give it a brief window or check status
        const timeout = setTimeout(() => {
            if (logstashTransport.isConnected()) {
                resolve();
            } else {
                reject(new Error('Logstash connection timeout/unavailable'));
            }
        }, 3000);

        // Check continuously until timeout or connection
        const interval = setInterval(() => {
            if (logstashTransport.isConnected()) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve();
            }
        }, 100);
    });
}

// Expose close method for server shutdown dependency arrays
export const closeLogstash = async (): Promise<void> => {
    await logstashTransport.close();
};

// Extract user info and request metadata safely for Express
function extractReqInfo(req?: Request): RequestInfo {
    if (!req) {
        return {
            token_user_id: 'anonymous',
            token_user_type: 'anonymous',
            correlation_id: 'N/A',
            target: 'N/A',
            ip: '0.0.0.0',
            method: 'N/A'
        };
    }

    const body = req?.body as Record<string, unknown> | undefined;
    const token_user_id = (body?.token_user_id as string) ?? 'anonymous';
    const token_user_type = (body?.token_user_type as string) ?? 'anonymous';
    const correlation_id = (req.headers['nonce'] as string) ?? (req.headers['x-correlation-id'] as string) ?? 'N/A';
    const target = req.originalUrl ?? req.url ?? 'N/A';
    const method = req.method ?? 'N/A';

    let ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    ip = ip.replace(/^::ffff:/, '');

    return {
        token_user_id,
        token_user_type,
        correlation_id,
        target,
        ip,
        method
    };
}

const isLoggingEnabled = (): boolean => {
    const envFlag = process.env.ENABLE_LOGS;
    if (!envFlag) return true;
    return envFlag.toLowerCase() !== 'false';
};

export default {
    connectLogstash,
    closeLogstash,
    info: (req: Request | null, message: string, meta: Record<string, unknown> = {}): void => {
        if (!isLoggingEnabled()) return;
        const reqInfo = extractReqInfo(req ?? undefined);
        logger.info(message, { meta: { ...meta, ...reqInfo } });
    },
    error: (req: Request | null, error: Error | string, message?: string): void => {
        if (!isLoggingEnabled()) return;
        const reqInfo = extractReqInfo(req ?? undefined);

        if (error instanceof Error) {
            const errorMessage = message
                ? `${message} Error: ${error.message} (${error.constructor.name})`
                : `${error.message} (${error.constructor.name})`;

            logger.error(errorMessage, {
                meta: { ...reqInfo },
                stack: error.stack
            });
        } else {
            logger.error(message || error, { meta: { ...reqInfo } });
        }
    },
    warn: (req: Request | null, message: string, meta: Record<string, unknown> = {}): void => {
        if (!isLoggingEnabled()) return;
        const reqInfo = extractReqInfo(req ?? undefined);
        logger.warn(message, { meta: { ...meta, ...reqInfo } });
    },
    debug: (req: Request | null, message: string, meta: Record<string, unknown> = {}): void => {
        if (!isLoggingEnabled()) return;
        const reqInfo = extractReqInfo(req ?? undefined);
        logger.debug(message, { meta: { ...meta, ...reqInfo } });
    },
};
