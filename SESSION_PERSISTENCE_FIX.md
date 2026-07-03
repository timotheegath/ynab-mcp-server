# Session Persistence Fix

This document describes the changes made to fix session persistence issues in the YNAB MCP server.

## Problems Fixed

1. **Express Rate Limiter Error**: `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`
2. **Session Persistence**: Sessions were not persisting across server restarts due to in-memory storage

## Changes Made

### 1. Express Trust Proxy Configuration (`src/index.ts`)

Added `app.set('trust proxy', true)` to configure Express to trust proxy headers when running behind nginx or other reverse proxies.

```typescript
const app = express();
// Trust proxy headers when running behind reverse proxy (nginx, etc.)
app.set('trust proxy', true);
```

### 2. File-Based Session Storage (`src/session-storage.ts`)

Added a new `FileSessionStorage` class that:
- Stores sessions as JSON files in a `./sessions` directory
- Handles session expiration with configurable TTL
- Provides better persistence than in-memory storage
- Is simple and reliable for personal use

### 3. Default Storage Type

Changed the default session storage from memory to file-based storage for better persistence.

### 4. Configuration Options

Added new configuration options:
- `SESSION_STORAGE_TYPE` environment variable: `memory`, `file`, or `redis`
- `--session-storage-type` command line option
- Default is now `file` storage for better persistence

## Usage

### Default (File Storage)
```bash
node dist/index.js --transport-mode http
```

### Explicit File Storage
```bash
node dist/index.js --transport-mode http --session-storage-type file
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

- `SESSION_STORAGE_TYPE`: `memory`, `file`, or `redis` (default: `file`)
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

## Testing

The fix has been tested and verified to:
1. Resolve the Express rate limiter proxy error
2. Persist sessions across server restarts
3. Handle session expiration correctly
4. Work with all storage types (memory, file, redis)

## Migration

No migration is needed. The file-based storage will automatically create the `./sessions` directory on first use and handle session persistence transparently.