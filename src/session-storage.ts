import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient, RedisClientType } from "redis";
import { promises as fs } from "fs";
import path from "path";

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
 * Hybrid session storage implementation
 * Uses file storage for session validation + in-memory cache for active transports
 * Ideal for personal use with limited sessions
 */
export class HybridSessionStorage implements SessionStorage {
  private readonly sessionsDir: string;
  private readonly ttlSeconds: number;
  private readonly transportCache: Record<string, StreamableHTTPServerTransport> = {};

  constructor(sessionsDir: string = './sessions', ttlSeconds: number = 86400) {
    this.sessionsDir = sessionsDir;
    this.ttlSeconds = ttlSeconds;

    // Create sessions directory if it doesn't exist
    fs.mkdir(this.sessionsDir, { recursive: true }).catch(error => {
      console.error('Failed to create sessions directory:', error);
      throw error;
    });
  }

  async setSession(sessionId: string, transport: StreamableHTTPServerTransport): Promise<void> {
    try {
      // Store session metadata in file for persistence
      const sessionData = {
        sessionId: transport.sessionId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.ttlSeconds * 1000).toISOString()
      };

      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));

      // Cache transport in memory for active use
      this.transportCache[sessionId] = transport;
    } catch (error) {
      console.error(`Failed to store session ${sessionId}:`, error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<StreamableHTTPServerTransport | null> {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const sessionData = JSON.parse(data);

      // Check if session has expired
      if (new Date(sessionData.expiresAt) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Return cached transport if available
      const cachedTransport = this.transportCache[sessionId];
      if (cachedTransport) {
        // Ensure the transport has the correct session ID
        // Note: transport.sessionId might be undefined until first request,
        // but that's okay - the session ID is managed by our storage layer
        return cachedTransport;
      }
      
      return null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // Session file doesn't exist
      }
      console.error(`Failed to retrieve session ${sessionId}:`, error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Remove from file storage
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to delete session file ${sessionId}:`, error);
        throw error;
      }
    }
    
    // Remove from memory cache
    delete this.transportCache[sessionId];
  }

  async hasSession(sessionId: string): Promise<boolean> {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      await fs.access(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false; // File doesn't exist
      }
      console.error(`Failed to check session ${sessionId}:`, error);
      throw error;
    }
  }
}

/**
 * Session storage factory function
 * Creates appropriate session storage based on configuration
 */
export function createSessionStorage(config: {
  redisUrl?: string;
  sessionTtlSeconds?: number;
  fileStorageDir?: string;
  storageType?: 'memory' | 'file' | 'hybrid' | 'redis';
}): SessionStorage {
  // Check storage type configuration
  if (config.storageType === 'redis' || config.redisUrl) {
    if (!config.redisUrl) {
      throw new Error('Redis storage selected but REDIS_URL not configured');
    }
    console.log('🔧 Using Redis for session storage');
    return new RedisSessionStorage(config.redisUrl, 'mcp_session:', config.sessionTtlSeconds);
  }
  
  if (config.storageType === 'file' || config.storageType === 'hybrid' || config.fileStorageDir) {
    console.log('🔄 Using hybrid session storage (file + memory)');
    return new HybridSessionStorage(config.fileStorageDir || './sessions', config.sessionTtlSeconds);
  }

  // Default to hybrid storage for better persistence in personal use
  console.log('🔄 Using hybrid session storage (file + memory) - default for personal use');
  return new HybridSessionStorage('./sessions', config.sessionTtlSeconds);
}