# Session Storage Migration Guide

This guide provides instructions for migrating existing YNAB MCP Server deployments to use the new persistent session storage feature.

## Overview

The session storage enhancement replaces the in-memory session storage with a configurable system that supports both Redis (persistent) and memory (fallback) storage. This change is **backward compatible** - existing clients will continue to work without modification.

## What's Changing

### Before
- Sessions stored in-memory only (`const transports: Record<string, ...> = {}`)
- Sessions lost on server restart
- No support for horizontal scaling
- Simple but limited functionality

### After
- Configurable session storage (Redis or Memory)
- Sessions persist across server restarts (with Redis)
- Supports horizontal scaling (with Redis)
- Automatic fallback to memory storage
- Health monitoring endpoint

## Migration Steps

### 1. Update to Latest Version

```bash
# If using npm
npm update ynab-mcp-server

# If using git
git pull origin main
npm install
npm run build
```

### 2. Choose Your Session Storage Strategy

#### Option A: Continue with Memory Storage (No Changes Required)

If you don't configure Redis, the server will automatically use memory storage with enhanced error handling.

```bash
# No configuration changes needed
npm start
```

**Pros:** Simple, no new dependencies
**Cons:** Sessions still lost on restart, no scaling support

#### Option B: Migrate to Redis Storage (Recommended)

For production deployments, we recommend using Redis for persistent session storage.

##### Prerequisites
- Redis server (v6.0+ recommended)
- Network connectivity between your MCP server and Redis

##### Installation

**Docker (Recommended):**
```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

**Linux (apt):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

**Mac (Homebrew):**
```bash
brew install redis
brew services start redis
```

##### Configuration

Add Redis configuration to your environment:

```bash
# Basic Redis configuration
REDIS_URL=redis://localhost:6379 npm start

# With custom session TTL (1 hour)
REDIS_URL=redis://localhost:6379 SESSION_TTL_SECONDS=3600 npm start

# With authentication (if your Redis requires password)
REDIS_URL=redis://:yourpassword@localhost:6379 npm start
```

**Docker Compose Example:**
```yaml
version: '3.8'

services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

  ynab-mcp-server:
    image: ynab-mcp-server:latest
    environment:
      - YNAB_API_TOKEN=${YNAB_API_TOKEN}
      - REDIS_URL=redis://redis:6379
      - SESSION_TTL_SECONDS=86400
    depends_on:
      - redis
    ports:
      - "3000:3000"
    restart: always

volumes:
  redis_data:
```

### 3. Test the Migration

Verify that sessions persist across server restarts:

```bash
# Start server with Redis
REDIS_URL=redis://localhost:6379 npm start

# In another terminal:
# 1. Create a session
SESSION_ID=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_ynab_api_token" \
  -d '{"action": "initialize"}' | jq -r '.sessionId')

# 2. Restart server (Ctrl+C and restart)

# 3. Reuse the same session
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_ynab_api_token" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"action": "list_accounts"}'

# Should return 200 status if session persisted
```

### 4. Monitor Session Storage Health

Use the new health check endpoint:

```bash
curl http://localhost:3000/health/session-storage
```

**Healthy Response:**
```json
{
  "status": "healthy",
  "storageType": "redis",
  "redisUrl": "configured",
  "sessionTtlSeconds": 86400,
  "testResults": {
    "setOperation": "success",
    "hasOperation": "success",
    "getOperation": "success",
    "deleteOperation": "success"
  }
}
```

### 5. Update Monitoring (Optional)

Add session storage metrics to your monitoring system:

```bash
# Check Redis connection status
redis-cli ping  # Should return "PONG"

# Monitor Redis memory usage
redis-cli info memory

# Check active sessions (approximate)
redis-cli dbsize
```

## Rollback Plan

If you encounter issues, you can easily rollback:

### Temporary Rollback
```bash
# Disable Redis and fall back to memory storage
npm start  # Without REDIS_URL environment variable
```

### Permanent Rollback
```bash
# Revert to previous version
git checkout v0.1.1  # Or your previous stable version
npm install
npm run build
npm start
```

## Troubleshooting

### Common Issues

**Redis Connection Failed:**
```
Error: Failed to connect to Redis: ECONNREFUSED
```
- **Solution:** Verify Redis is running and accessible
- Check Redis URL format
- Test connection with `redis-cli ping`
- Verify firewall/network settings

**Session Not Persisting:**
```
Session exists but transport unavailable
```
- **Solution:** This is expected behavior with memory storage
- With Redis, sessions should persist but transports are recreated
- Verify Redis is configured correctly

**Performance Issues:**
- **Solution:** Check Redis latency with `redis-cli --latency`
- Consider adding Redis connection pooling
- Monitor Redis memory usage

### Debugging Commands

```bash
# Check Redis server status
redis-cli info

# Test Redis connectivity
redis-cli ping

# Monitor Redis operations
redis-cli monitor

# Check server logs
journalctl -u ynab-mcp-server -f  # Systemd
docker logs ynab-mcp-server         # Docker
```

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | - | Redis connection URL (e.g., `redis://localhost:6379`) |
| `SESSION_TTL_SECONDS` | 86400 | Session time-to-live in seconds (24 hours) |
| `YNAB_API_TOKEN` | - | Required YNAB API token |
| `PORT` | 3000 | HTTP server port |

### Redis URL Formats

- Basic: `redis://localhost:6379`
- With password: `redis://:password@localhost:6379`
- With database: `redis://localhost:6379/1`
- With TLS: `rediss://localhost:6379`

## Performance Considerations

### Redis Performance Tips

1. **Connection Pooling:** Consider using Redis connection pooling for high-traffic deployments
2. **Memory Optimization:** Monitor Redis memory usage with `redis-cli info memory`
3. **Persistence:** Configure appropriate Redis persistence settings based on your needs
4. **Network Latency:** Locate Redis server close to your MCP server for minimal latency

### Memory Storage Considerations

1. **Session Limit:** Memory storage is suitable for single-instance, low-traffic deployments
2. **Restart Impact:** All sessions will be lost on server restart
3. **Memory Usage:** Monitor server memory usage with long-running sessions

## Security Considerations

### Redis Security

1. **Authentication:** Always use Redis authentication in production
2. **Network Isolation:** Restrict Redis access to trusted networks only
3. **TLS Encryption:** Use `rediss://` for encrypted connections
4. **Firewall Rules:** Limit Redis port (6379) exposure

### Session Security

1. **Session IDs:** Continue using UUID v4 for session identifiers
2. **TTL:** Keep reasonable session expiration times
3. **Cleanup:** Consider implementing session cleanup for abandoned sessions

## Monitoring and Alerts

### Recommended Metrics

1. **Redis Connection Status:** Monitor Redis availability
2. **Session Count:** Track active sessions over time
3. **Storage Type:** Monitor which storage backend is active
4. **Error Rates:** Track session storage failures
5. **Response Times:** Monitor session operation latency

### Alert Conditions

1. **Redis Connection Failures:** Alert on repeated connection failures
2. **High Session Count:** Alert on unusually high session counts
3. **Storage Fallback:** Alert when falling back to memory storage
4. **Slow Response Times:** Alert on degraded session performance

## Success Criteria

✅ Sessions persist across server restarts (with Redis)
✅ No breaking changes to existing client functionality
✅ Graceful fallback to memory storage when Redis unavailable
✅ Health monitoring endpoint operational
✅ Comprehensive logging of session operations

## Support

If you encounter issues during migration:

1. Check the [troubleshooting section](#troubleshooting)
2. Review server logs for detailed error information
3. Test with memory storage first, then migrate to Redis
4. Monitor the health check endpoint for storage status

## Additional Resources

- [Redis Documentation](https://redis.io/docs/)
- [YNAB MCP Server README](README.md)
- [Session Storage Design](openspec/changes/fix-session-storage/design.md)

## Changelog

### v0.1.2 (Current)
- Added Redis session storage support
- Enhanced memory session storage
- Added health check endpoint
- Improved error handling and logging

### v0.1.1
- Basic in-memory session storage
- Initial HTTP transport support
- Simple session management

## Future Enhancements

The following features are planned for future releases:

- Session expiration and automatic cleanup
- Session data encryption
- Multi-region session replication
- Detailed monitoring and analytics
- Session usage metrics and reporting