# Session Storage Fix Proposal

## Problem Statement

The current YNAB MCP server implementation uses an in-memory session storage mechanism that fails to persist sessions across server restarts or in containerized environments. This causes "Invalid session ID" errors when clients attempt to reuse sessions.

### Current Behavior

From the logs, we can see:
1. A new session is successfully created: `POST /mcp new-session` returns 200
2. Subsequent requests with the same session ID fail: `POST /mcp session=14ae0344-59cd-4787-a098-b75529629a52` returns 400 with "Invalid session ID"
3. All subsequent requests with that session ID continue to fail

### Root Cause

The issue is in `src/index.ts` lines 366 and 391:

```typescript
const transports: Record<string, StreamableHTTPServerTransport> = {};
// ...
transports[generatedSessionId] = transport;
```

This in-memory object is cleared when:
- The server process restarts
- The container is redeployed
- The server crashes
- Multiple server instances are running (scaling)

## Proposed Solution

Replace the in-memory session storage with a persistent storage mechanism. We have several options:

### Option 1: File-based Session Storage
- Store sessions in JSON files on disk
- Simple to implement, no additional dependencies
- Works well for single-instance deployments
- Limited scalability for multi-instance setups

### Option 2: Redis Session Storage (Recommended)
- Use Redis as a session store
- Excellent performance and scalability
- Supports multi-instance deployments
- Requires Redis dependency and configuration
- Industry standard for session management

### Option 3: Database Session Storage
- Store sessions in the existing database
- Good for applications already using a database
- More complex to implement than Redis
- May have performance implications

## Recommendation

**Implement Option 2: Redis Session Storage** as it provides the best balance of performance, scalability, and reliability. This will:

1. Fix the immediate session persistence issue
2. Enable future horizontal scaling
3. Follow industry best practices
4. Provide better fault tolerance

## Impact Assessment

### Benefits
- ✅ Fixes session validation errors
- ✅ Enables server restarts without session loss
- ✅ Supports horizontal scaling
- ✅ Improves fault tolerance
- ✅ Follows industry best practices

### Risks
- ⚠️ Adds Redis dependency (mitigated by making it optional/configurable)
- ⚠️ Slightly increased complexity (mitigated by clean abstraction)
- ⚠️ Migration needed for existing deployments (mitigated by backward compatibility)

### Backward Compatibility

The change should be backward compatible:
- Existing clients will continue to work
- Session initialization protocol remains unchanged
- Only the storage backend changes internally

## Success Criteria

1. ✅ Sessions persist across server restarts
2. ✅ No "Invalid session ID" errors for valid sessions
3. ✅ Performance impact is minimal (<5% increase in response time)
4. ✅ Redis dependency is optional (fallback to memory if not configured)
5. ✅ Existing tests continue to pass
6. ✅ Mock curl commands provided for testing
7. ✅ Comprehensive logging of session operations

## Mock Curl Commands for Testing

The following curl commands can be used to test the session storage functionality:

### 1. Create a new session
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_ynab_api_token" \
  -d '{"action": "new_session"}'
```

Expected response:
```json
{
  "status": "success",
  "sessionId": "14ae0344-59cd-4787-a098-b75529629a52",
  "message": "New MCP session initialized"
}
```

### 2. Use an existing session
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_ynab_api_token" \
  -H "Mcp-Session-Id: 14ae0344-59cd-4787-a098-b75529629a52" \
  -d '{"action": "list_accounts"}'
```

Expected response (successful session reuse):
```json
{
  "status": "success",
  "data": [/* account data */],
  "message": "Session reused successfully"
}
```

### 3. Test session persistence after server restart
```bash
# Step 1: Create session
SESSION_ID=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_ynab_api_token" \
  -d '{"action": "new_session"}' | jq -r '.sessionId')

# Step 2: Restart server (simulate)
# docker restart your_mcp_server_container

# Step 3: Use the same session after restart
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_ynab_api_token" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"action": "list_accounts"}'
```

### 4. Test invalid session
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_ynab_api_token" \
  -H "Mcp-Session-Id: invalid-session-id-12345" \
  -d '{"action": "list_accounts"}'
```

Expected response:
```json
{
  "status": "error",
  "code": "INVALID_SESSION",
  "message": "Invalid session ID"
}
```

## Logging Requirements

The implementation should include comprehensive logging for session operations:

### Log Format
```
[TIMESTAMP] [LEVEL] [SESSION_ID] [OPERATION] [STATUS] [DETAILS]
```

### Required Log Events

1. **Session Creation**
   - Level: INFO
   - Message: `New MCP session initialized: {sessionId}`
   - Details: Storage type (Redis/Memory), TTL

2. **Session Reuse**
   - Level: INFO  
   - Message: `Reusing existing session: {sessionId}`
   - Details: Storage type, operation type

3. **Session Not Found**
   - Level: WARN
   - Message: `Session not found: {sessionId}`
   - Details: Storage type, client IP

4. **Session Expiration**
   - Level: INFO
   - Message: `Session expired: {sessionId}`
   - Details: Duration, storage type

5. **Storage Errors**
   - Level: ERROR
   - Message: `Session storage error: {errorMessage}`
   - Details: Storage type, operation, stack trace

6. **Redis Connection Issues**
   - Level: ERROR
   - Message: `Redis connection failed: {errorMessage}`
   - Details: Fallback to memory storage

7. **Fallback Events**
   - Level: WARN
   - Message: `Fallback to memory storage`
   - Details: Reason for fallback

### Log Configuration

Environment variables for log control:
- `SESSION_LOG_LEVEL`: DEBUG, INFO, WARN, ERROR (default: INFO)
- `SESSION_LOG_FILE`: Path to log file (default: stdout)

### Example Log Output
```
2026-07-03T14:30:15.123Z INFO 14ae0344-59cd-4787-a098-b75529629a52 session_created Redis TTL=86400
2026-07-03T14:30:16.456Z INFO 14ae0344-59cd-4787-a098-b75529629a52 session_reused Redis operation=list_accounts
2026-07-03T14:31:02.789Z WARN abcd1234-5678-90ef-ghij-klmnopqrstuv session_not_found Memory client=192.168.1.100
2026-07-03T14:32:15.321Z ERROR redis_connection_failed ECONNREFUSED Fallback to memory storage
```

## Out of Scope

- Session expiration and cleanup (can be added later)
- Session data encryption (can be added later)
- Multi-region session replication (future enhancement)
- Detailed monitoring and analytics (future enhancement)