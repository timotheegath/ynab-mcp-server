## Context

The current HTTP transport implementation creates stateless transport instances for each request, breaking MCP session continuity. For single-user personal use, we need basic session stability without enterprise-grade complexity.

Current constraints:
- Single user (me) accessing the service
- Hardcoded YNAB token for personal budget
- No concurrent session needs
- Focus on stability over security complexity

## Goals / Non-Goals

**Goals:**
- Implement basic stateful session management
- Enable session continuity for MCP to work properly
- Simple transport reuse across requests
- Minimal but effective error handling
- Easy to understand and maintain

**Non-Goals:**
- Enterprise-grade security (Origin validation, DNS rebinding)
- Concurrent session support
- Resumability and complex lifecycle management
- Comprehensive testing suite
- Production monitoring and metrics

## Decisions

### 1. Simplified Unified Request Handler
**Decision**: Use single `app.all('/mcp')` handler with basic session routing.

**Rationale**:
- Simple to implement and understand
- Handles all MCP methods in one place
- Easy to debug for single user

**Implementation**:
```typescript
app.all('/mcp', async (req, res) => {
  // Basic session routing logic
  // No complex validation needed for personal use
});
```

### 2. Basic Stateful Transport
**Decision**: Use simple session ID generation without complex lifecycle management.

**Rationale**:
- Gets the job done for single user
- Minimal overhead
- Easy to maintain

**Implementation**:
```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  // No complex callbacks needed
});
```

### 3. Simple Transport Storage
**Decision**: Basic in-memory transport storage with manual cleanup.

**Rationale**:
- Single user means one session at a time
- No need for complex cleanup mechanisms
- Can manually restart if issues occur

**Implementation**:
```typescript
const transports = {};

// Store when created
transports[sessionId] = transport;

// Simple cleanup on restart
```

### 4. Minimal Security
**Decision**: Basic CORS for single-user use, no complex validation.

**Rationale**:
- Running locally for personal use
- No external attack surface
- YNAB token already protects access

**Implementation**:
```typescript
// Basic CORS - allow local development origins
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Simple for local use
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  next();
});
```

### 5. Simple Session Flow
**Decision**: Basic session initialization and reuse.

**Rationale**:
- Covers the happy path for personal use
- Easy to understand and debug
- Can manually restart if sessions get messed up

**Session Flow**:
1. POST initialize → Create session and transport
2. Store transport in simple map
3. Reuse transport for subsequent requests
4. Manual cleanup if needed (restart server)

## Risks / Trade-offs

### Risk: Memory Leaks
**Mitigation**: 
- Single session means minimal risk
- Can restart server if issues occur
- No complex cleanup needed

### Risk: Session Issues
**Mitigation**:
- Simple error messages for debugging
- Can restart server to reset
- No critical production impact

### Risk: Security
**Mitigation**:
- Running locally only
- YNAB token already protects access
- No sensitive multi-user data

## Simplified Implementation

### Steps:
1. Replace separate handlers with single `app.all('/mcp')`
2. Add basic session ID generation
3. Store transport in simple object
4. Reuse transport for subsequent requests
5. Add basic error responses

### Testing:
- Manual testing of session flow
- Check that SSE works after initialize
- Verify session ID is returned and reused

## Open Questions

None - keeping it simple for personal use!
