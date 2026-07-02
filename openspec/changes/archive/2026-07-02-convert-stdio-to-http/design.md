## Context

The current YNAB MCP server uses stdio transport for local CLI communication. This limits deployment to single-process local usage only. The conversion to HTTP transport will enable remote access, multi-client support, and web integration while maintaining backward compatibility during transition.

Current architecture:
- Single MCP server instance with 14 YNAB tools
- Stdio-based communication via process.stdin/stdout
- Environment variables: YNAB_API_TOKEN, YNAB_BUDGET_ID
- TypeScript codebase with Vitest testing

## Goals / Non-Goals

**Goals:**
- Enable HTTP-based MCP communication alongside existing stdio
- Maintain all existing tool functionality unchanged
- Add proper authentication for HTTP endpoints
- Support containerized deployment and cloud hosting
- Provide dual-mode operation during transition period
- Minimal breaking changes to existing usage patterns

**Non-Goals:**
- Rewriting the tool implementations
- Changing the YNAB API integration
- Adding new YNAB functionality
- Implementing complex session management (start with stateless)
- Building a web UI or frontend

## Decisions

### 1. Transport Replacement
**Decision**: Use `NodeStreamableHTTPServerTransport` from MCP SDK
**Rationale**: 
- Already imported in current codebase (line 4 of index.ts)
- Designed specifically for Node.js HTTP servers
- Maintains compatibility with existing MCP server architecture
- Supports both stateless and stateful modes

**Alternatives considered**:
- Custom HTTP implementation: More control but higher maintenance
- Express/Fastify middleware: More overhead than needed
- WebSocket transport: Overkill for MCP protocol needs

### 2. Authentication Approach
**Decision**: API key authentication via HTTP headers
**Rationale**: 
- Simple and effective for server-to-server communication
- Compatible with existing YNAB_API_TOKEN pattern
- Easy to implement and debug
- Can be extended to JWT later if needed

**Implementation**:
- Require `Authorization: Bearer <token>` header
- Compare against `HTTP_AUTH_TOKEN` environment variable
- Return 401 Unauthorized for missing/invalid tokens

### 3. Deployment Strategy
**Decision**: Dual-mode operation (stdio + HTTP simultaneously)
**Rationale**: 
- Smooth migration path for existing users
- Allows testing HTTP mode without breaking stdio
- Can be controlled via environment variable or command-line flag
- Easy to deprecate stdio mode later

**Implementation**:
- Add `TRANSPORT_MODE` env var: `stdio`, `http`, or `both`
- Default to `stdio` for backward compatibility
- HTTP mode requires `PORT` and `HTTP_AUTH_TOKEN`

### 4. Session Management
**Decision**: Start with stateless mode (`sessionIdGenerator: undefined`)
**Rationale**: 
- Simpler implementation and debugging
- MCP protocol doesn't require sessions for basic operation
- Can add stateful mode later if needed for advanced features
- Reduces server memory footprint

### 5. Configuration Management
**Decision**: Environment variables for all HTTP settings
**Rationale**: 
- Consistent with existing YNAB_API_TOKEN pattern
- Easy to configure in different environments
- Works well with container orchestration
- Secure (no hardcoded credentials)

**New environment variables**:
- `PORT`: HTTP server port (default: 3000)
- `HTTP_AUTH_TOKEN`: API key for authentication
- `TRANSPORT_MODE`: `stdio`, `http`, or `both` (default: `stdio`)
- `CORS_ORIGINS`: Optional CORS allowed origins (comma-separated)

## Risks / Trade-offs

### Security Risks
**[Risk]**: HTTP endpoints exposed without proper authentication could allow unauthorized YNAB access
**Mitigation**: 
- Mandatory API key authentication
- HTTPS requirement in documentation
- Rate limiting considerations for production
- Never expose YNAB_API_TOKEN via HTTP

**[Risk]**: CORS misconfiguration could allow cross-site request forgery
**Mitigation**: 
- Strict CORS origin restrictions
- Default to no CORS (same-origin only)
- Document CORS configuration carefully

### Operational Risks
**[Risk]**: HTTP server could become a performance bottleneck
**Mitigation**: 
- Node.js HTTP server is lightweight for MCP traffic
- Add monitoring and metrics early
- Document scaling considerations

**[Risk]**: Breaking existing stdio-based deployments
**Mitigation**: 
- Dual-mode operation during transition
- Clear documentation of changes
- Backward compatibility focus

### Technical Risks
**[Risk]**: StreamableHTTPServerTransport may have undocumented behaviors
**Mitigation**: 
- Start with minimal implementation
- Comprehensive testing
- Fallback to stdio mode if HTTP fails

**[Risk]**: Memory leaks in long-running HTTP server
**Mitigation**: 
- Use stateless mode initially
- Add proper connection cleanup
- Implement health check endpoints

## Migration Plan

### Phase 1: Development
1. Implement HTTP transport alongside existing stdio
2. Add authentication middleware
3. Create comprehensive test suite
4. Update documentation

### Phase 2: Testing
1. Test dual-mode operation locally
2. Test containerized deployment
3. Performance and load testing
4. Security audit

### Phase 3: Rollout
1. Release as beta with dual-mode support
2. Gather feedback from early adopters
3. Address any issues found
4. Document migration guide

### Phase 4: Deprecation (Optional)
1. Announce stdio mode deprecation timeline
2. Provide migration tools/scripts
3. Remove stdio mode in future major version

### Rollback Strategy
- Simple: Set `TRANSPORT_MODE=stdio` to revert to original behavior
- No database migrations or breaking changes
- HTTP mode is additive, not replacement

## Open Questions

1. Should we support WebSocket transport as an alternative to HTTP?
2. What level of request logging is appropriate for production?
3. Should we implement rate limiting from the start?
4. What monitoring/metrics should be included in initial implementation?
5. Should the HTTP server support TLS termination directly or rely on reverse proxy?