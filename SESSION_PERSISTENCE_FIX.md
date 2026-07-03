# Session Persistence Fix

This document describes the changes made to fix session persistence issues in the YNAB MCP server.

## Problems Fixed

1. **Express Rate Limiter Error**: `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`
2. **Session Persistence**: Sessions were not persisting across server restarts due to in-memory storage
3. **Session Validation**: Session IDs were being rejected as invalid on subsequent requests

## Changes Made

### 1. Express Trust Proxy Configuration (`src/index.ts`)

Added `app.set('trust proxy', true)` to configure Express to trust proxy headers when running behind nginx or other reverse proxies.

```typescript
const app = express();
// Trust proxy headers when running behind reverse proxy (nginx, etc.)
app.set('trust proxy', true);
```

### 2. Hybrid Session Storage (`src/session-storage.ts`)

Added a new `HybridSessionStorage` class that combines:
- **File Storage**: Persists session metadata to `./sessions` directory for validation across restarts
- **Memory Cache**: Caches active transport objects in memory for performance during server lifetime

This approach solves the serialization problem while providing persistence.

### 3. Default Storage Type

Changed the default session storage from memory to hybrid storage for better persistence.

### 4. Configuration Options

Added new configuration options:
- `SESSION_STORAGE_TYPE` environment variable: `memory`, `file`, `hybrid`, or `redis`
- `--session-storage-type` command line option
- Default is now `hybrid` storage for optimal personal use

## How It Works

The hybrid approach works as follows:

1. **Session Creation**: When a new session is created, metadata is stored in a file and the transport object is cached in memory
2. **Session Validation**: `hasSession()` checks the file system to validate session existence across restarts
3. **Session Retrieval**: `getSession()` returns the cached transport object (or null if not in cache)
4. **Session Persistence**: File metadata persists across restarts, enabling session validation

## Usage

### Default (Hybrid Storage)
```bash
node dist/index.js --transport-mode http
```

### Explicit Hybrid Storage
```bash
node dist/index.js --transport-mode http --session-storage-type hybrid
```

### Memory Storage (for testing)
```bash
node dist/index.js --transport-mode http --session-storage-type memory
```

### Redis Storage (for production)
```bash
node dist/index.js --transport-mode http --session-storage-type redis --redis-url redis://localhost:6379
```

## Environment Variables

- `SESSION_STORAGE_TYPE`: `memory`, `file`, `hybrid`, or `redis` (default: `hybrid`)
- `SESSION_TTL_SECONDS`: Session time-to-live in seconds (default: `86400` = 24 hours)
- `REDIS_URL`: Redis connection URL (required for Redis storage)

## Docker Considerations

For Docker deployments, add a volume to persist the sessions directory:

```yaml
volumes:
  - ./sessions:/app/sessions
```

Or in Dockerfile:
```dockerfile
VOLUME ["/app/sessions"]
```

## Session Lifecycle

1. **First Request**: Client makes initial request without session ID
2. **Session Creation**: Server creates new session, stores metadata in file, caches transport in memory
3. **Subsequent Requests**: Client includes session ID in `MCP-Session-Id` header
4. **Session Validation**: Server checks file system to validate session exists
5. **Session Reuse**: Server retrieves cached transport from memory and handles request
6. **Server Restart**: Session metadata persists in files, enabling validation when server restarts

## Testing

The fix has been tested and verified to:
1. ✅ Resolve the Express rate limiter proxy error  
2. ✅ Persist session metadata across server restarts
3. ✅ Validate sessions correctly on subsequent requests
4. ✅ Handle session expiration properly
5. ✅ Work with all storage types (memory, file, hybrid, redis)

## Migration

No migration is needed. The hybrid storage will automatically:
- Create the `./sessions` directory on first use
- Handle session persistence transparently
- Maintain backward compatibility with existing clients

## Troubleshooting

If you encounter session validation issues:

1. **Check sessions directory**: `ls -la sessions/` should show session files
2. **Verify permissions**: Ensure the server can read/write to the sessions directory
3. **Check session TTL**: Default is 24 hours, adjust with `SESSION_TTL_SECONDS`
4. **Test with memory storage**: `SESSION_STORAGE_TYPE=memory` for debugging

## Performance Considerations

For personal use with 1-2 sessions:
- **Hybrid storage** provides the best balance of persistence and performance
- **File I/O overhead** is negligible with few sessions
- **Memory usage** remains low as only active sessions are cached
- **Session validation** is fast (file existence check)