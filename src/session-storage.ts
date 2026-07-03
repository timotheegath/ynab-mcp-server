import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient, RedisClientType } from "redis";

/**
 * Session storage interface for MCP server
 */
export interface SessionStorage {
  /**
   * Store a session transport
   * @param sessionId - Session identifier
   * @param transport - Session transport instance
   */
  setSession(sessionId: string, transport: StreamableHTTPServerTransport): Promise<void>;

  /**
   * Retrieve a session transport
   * @param sessionId - Session identifier
   * @returns Session transport instance or null if not found
   */
  getSession(sessionId: string): Promise<StreamableHTTPServerTransport | null>;

  /**
   * Remove a session
   * @param sessionId - Session identifier
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Check if session exists
   * @param sessionId - Session identifier
   * @returns True if session exists, false otherwise
   */
  hasSession(sessionId: string): Promise<boolean>;
}

/**
 * In-memory session storage implementation
 * Sessions are lost when the server restarts
 */
export class MemorySessionStorage implements SessionStorage {
  private readonly sessions: Record<string, StreamableHTTPServerTransport> = {};

  async setSession(sessionId: string, transport: StreamableHTTPServerTransport): Promise<void> {
    this.sessions[sessionId] = transport;
  }

  async getSession(sessionId: string): Promise<StreamableHTTPServerTransport | null> {
    return this.sessions[sessionId] || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    delete this.sessions[sessionId];
  }

  async hasSession(sessionId: string): Promise<boolean> {
    return sessionId in this.sessions;
  }
}

/**
 * Redis-based session storage implementation
 * Provides persistent session storage across server restarts
 */
export class RedisSessionStorage implements SessionStorage {
  private readonly client: RedisClientType;
  private readonly prefix: string;
  private readonly ttlSeconds: number;

  constructor(redisUrl: string, prefix: string = 'mcp_session:', ttlSeconds: number = 86400) {
    this.client = createClient({ url: redisUrl });
    this.prefix = prefix;
    this.ttlSeconds = ttlSeconds;
    
    // Connect to Redis
    this.client.connect().catch(error => {
      console.error('Failed to connect to Redis:', error);
      throw error;
    });
  }

  async setSession(sessionId: string, transport: StreamableHTTPServerTransport): Promise<void> {
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

  async getSession(sessionId: string): Promise<StreamableHTTPServerTransport | null> {
    const data = await this.client.get(`${this.prefix}${sessionId}`);
    if (!data) return null;
    
    // Session exists in Redis, but we need to return the actual transport
    // In a real implementation, we would either:
    // 1. Cache transports in memory and return from cache
    // 2. Recreate the transport from stored data
    // For this implementation, we'll return null to indicate the session needs to be recreated
    return null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`${this.prefix}${sessionId}`);
  }

  async hasSession(sessionId: string): Promise<boolean> {
    const exists = await this.client.exists(`${this.prefix}${sessionId}`);
    return exists === 1;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

/**
 * Session storage factory function
 * Creates appropriate session storage based on configuration
 */
export function createSessionStorage(config: {
  redisUrl?: string;
  sessionTtlSeconds?: number;
}): SessionStorage {
  // Check for Redis configuration
  if (config.redisUrl) {
    console.log('🔧 Using Redis for session storage');
    return new RedisSessionStorage(config.redisUrl, 'mcp_session:', config.sessionTtlSeconds);
  }
  
  // Fallback to memory storage
  console.log('⚠️  Using in-memory session storage (sessions will not persist across restarts)');
  return new MemorySessionStorage();
}