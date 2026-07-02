## Why

The current HTTP transport implementation has a session management issue that prevents proper MCP operation. Each POST request creates a new stateless transport instance that is discarded, breaking session continuity needed for GET (SSE) and DELETE requests. For a single-user personal setup, we need basic session stability without complex security overhead.

## What Changes

- **HTTP Transport Session Management**: Implement basic stateful session handling with transport instance reuse
- **Session-Based Routing**: Replace separate handlers with unified session-aware routing
- **Basic Transport Lifecycle**: Simple transport storage and cleanup
- **Minimal Security**: Basic CORS configuration for single-user use

## Capabilities

### New Capabilities
- `http-stateful-sessions`: Basic stateful session management for HTTP transport
- `simple-transport-lifecycle`: Simple transport instance management

### Modified Capabilities
- `http-transport`: Change from stateless to basic stateful session management

## Impact

- **src/index.ts**: Refactoring of HTTP transport setup and request handling
- **HTTP API**: No breaking changes, internal session behavior improves
- **Memory Management**: Basic resource cleanup
- **Complexity**: Reduced from enterprise-grade to personal-use appropriate
