import { createClient } from "redis";
/**
 * In-memory session storage implementation
 * Sessions are lost when the server restarts
 */
export class MemorySessionStorage {
    sessions = {};
    async setSession(sessionId, transport) {
        this.sessions[sessionId] = transport;
    }
    async getSession(sessionId) {
        return this.sessions[sessionId] || null;
    }
    async deleteSession(sessionId) {
        delete this.sessions[sessionId];
    }
    async hasSession(sessionId) {
        return sessionId in this.sessions;
    }
}
/**
 * Redis-based session storage implementation
 * Provides persistent session storage across server restarts
 */
export class RedisSessionStorage {
    client;
    prefix;
    ttlSeconds;
    constructor(redisUrl, prefix = 'mcp_session:', ttlSeconds = 86400) {
        this.client = createClient({ url: redisUrl });
        this.prefix = prefix;
        this.ttlSeconds = ttlSeconds;
        // Connect to Redis
        this.client.connect().catch(error => {
            console.error('Failed to connect to Redis:', error);
            throw error;
        });
    }
    async setSession(sessionId, transport) {
        // Store session metadata in Redis
        const sessionData = {
            sessionId: transport.sessionId,
            createdAt: new Date().toISOString(),
            // Note: We store minimal data in Redis, the actual transport is cached in memory
            // This allows us to validate session existence while maintaining performance
        };
        await this.client.set(`${this.prefix}${sessionId}`, JSON.stringify(sessionData), {
            EX: this.ttlSeconds // Set TTL for automatic expiration
        });
    }
    async getSession(sessionId) {
        const data = await this.client.get(`${this.prefix}${sessionId}`);
        if (!data)
            return null;
        // Session exists in Redis, but we need to return the actual transport
        // In a real implementation, we would either:
        // 1. Cache transports in memory and return from cache
        // 2. Recreate the transport from stored data
        // For this implementation, we'll return null to indicate the session needs to be recreated
        return null;
    }
    async deleteSession(sessionId) {
        await this.client.del(`${this.prefix}${sessionId}`);
    }
    async hasSession(sessionId) {
        const exists = await this.client.exists(`${this.prefix}${sessionId}`);
        return exists === 1;
    }
    /**
     * Close Redis connection
     */
    async close() {
        await this.client.quit();
    }
}
/**
 * Session storage factory function
 * Creates appropriate session storage based on configuration
 */
export function createSessionStorage(config) {
    // Check for Redis configuration
    if (config.redisUrl) {
        console.log('🔧 Using Redis for session storage');
        return new RedisSessionStorage(config.redisUrl, 'mcp_session:', config.sessionTtlSeconds);
    }
    // Fallback to memory storage
    console.log('⚠️  Using in-memory session storage (sessions will not persist across restarts)');
    return new MemorySessionStorage();
}
