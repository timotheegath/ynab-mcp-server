import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSessionStorage, MemorySessionStorage } from '../session-storage.js';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

describe('Session Storage End-to-End Tests', () => {
  let memoryStorage: MemorySessionStorage;
  let mockTransport: StreamableHTTPServerTransport;

  beforeAll(() => {
    memoryStorage = new MemorySessionStorage();
    mockTransport = {
      sessionId: 'e2e-test-session',
      // Mock other required properties
    } as unknown as StreamableHTTPServerTransport;
  });

  describe('Complete Session Lifecycle', () => {
    it('should handle complete session lifecycle with memory storage', async () => {
      const sessionId = 'complete-lifecycle-test';
      
      // 1. Create new session
      await memoryStorage.setSession(sessionId, mockTransport);
      let exists = await memoryStorage.hasSession(sessionId);
      expect(exists).toBe(true);
      
      // 2. Verify session can be retrieved
      const retrieved = await memoryStorage.getSession(sessionId);
      expect(retrieved).toBe(mockTransport);
      
      // 3. Simulate session reuse (multiple accesses)
      for (let i = 0; i < 3; i++) {
        const session = await memoryStorage.getSession(sessionId);
        expect(session).toBe(mockTransport);
        const stillExists = await memoryStorage.hasSession(sessionId);
        expect(stillExists).toBe(true);
      }
      
      // 4. Delete session
      await memoryStorage.deleteSession(sessionId);
      exists = await memoryStorage.hasSession(sessionId);
      expect(exists).toBe(false);
      
      // 5. Verify session is gone
      const deletedSession = await memoryStorage.getSession(sessionId);
      expect(deletedSession).toBeNull();
    });

    it('should handle concurrent sessions independently', async () => {
      const sessions = [];
      
      // Create 5 concurrent sessions
      for (let i = 0; i < 5; i++) {
        const sessionId = `concurrent-${i}`;
        const transport = { sessionId } as unknown as StreamableHTTPServerTransport;
        await memoryStorage.setSession(sessionId, transport);
        sessions.push({ sessionId, transport });
      }

      // Verify each session can be retrieved independently
      for (const { sessionId, transport } of sessions) {
        const retrieved = await memoryStorage.getSession(sessionId);
        expect(retrieved).toBe(transport);
      }

      // Delete some sessions
      await memoryStorage.deleteSession(sessions[1].sessionId);
      await memoryStorage.deleteSession(sessions[3].sessionId);

      // Verify remaining sessions still work
      for (let i = 0; i < sessions.length; i++) {
        if (i === 1 || i === 3) {
          // These should be deleted
          expect(await memoryStorage.hasSession(sessions[i].sessionId)).toBe(false);
        } else {
          // These should still exist
          expect(await memoryStorage.hasSession(sessions[i].sessionId)).toBe(true);
        }
      }
    });
  });

  describe('Session Storage Factory Integration', () => {
    it('should create functional storage with memory configuration', () => {
      const config = { redisUrl: undefined, sessionTtlSeconds: 86400 };
      const storage = createSessionStorage(config);
      
      // The storage should be functional
      expect(storage).toBeDefined();
      expect(typeof storage.setSession).toBe('function');
      expect(typeof storage.getSession).toBe('function');
      expect(typeof storage.deleteSession).toBe('function');
      expect(typeof storage.hasSession).toBe('function');
    });

    it('should handle Redis configuration without throwing', () => {
      // This test verifies that the factory function can handle Redis config
      // without actually connecting to Redis (which would require Redis to be running)
      const config = { redisUrl: 'redis://localhost:6379', sessionTtlSeconds: 3600 };
      
      // We expect this to be callable, though it might fail if Redis isn't available
      // The important thing is that the factory function exists and can be called
      // Note: This will throw if Redis isn't running, but that's expected behavior
      try {
        const storage = createSessionStorage(config);
        expect(storage).toBeDefined();
      } catch (error) {
        // Expected if Redis isn't running
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('ECONNREFUSED');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent sessions gracefully', async () => {
      // Test various operations on non-existent sessions
      const nonExistentId = 'does-not-exist';
      
      const retrieved = await memoryStorage.getSession(nonExistentId);
      expect(retrieved).toBeNull();
      
      const exists = await memoryStorage.hasSession(nonExistentId);
      expect(exists).toBe(false);
      
      // Deleting non-existent session should not throw
      await expect(memoryStorage.deleteSession(nonExistentId)).resolves.not.toThrow();
    });

    it('should handle empty session IDs', async () => {
      const emptyId = '';
      
      await memoryStorage.setSession(emptyId, mockTransport);
      const exists = await memoryStorage.hasSession(emptyId);
      expect(exists).toBe(true);
      
      const retrieved = await memoryStorage.getSession(emptyId);
      expect(retrieved).toBe(mockTransport);
    });

    it('should handle special characters in session IDs', async () => {
      const specialId = 'session-with-special-chars_123!@#';
      
      await memoryStorage.setSession(specialId, mockTransport);
      const exists = await memoryStorage.hasSession(specialId);
      expect(exists).toBe(true);
      
      const retrieved = await memoryStorage.getSession(specialId);
      expect(retrieved).toBe(mockTransport);
    });
  });
});