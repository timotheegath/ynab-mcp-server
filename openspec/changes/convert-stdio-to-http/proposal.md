## Why

The current YNAB MCP server uses stdio transport, which limits deployment to local CLI usage only. Converting to HTTP transport will enable remote deployment, web/mobile integration, and multi-client access while maintaining all existing functionality.

## What Changes

- **Transport Layer**: Replace `StdioServerTransport` with `StreamableHTTPServerTransport`
- **Server Mode**: Add HTTP server alongside existing stdio (dual-mode during transition)
- **Authentication**: Add HTTP authentication layer (API key based)
- **Configuration**: Add environment variables for HTTP settings (`PORT`, `HTTP_AUTH_TOKEN`)
- **Deployment**: Enable containerized deployment and cloud hosting
- **Documentation**: Update README with HTTP deployment instructions

## Capabilities

### New Capabilities
- `http-transport`: HTTP-based MCP transport layer using StreamableHTTPServerTransport
- `http-authentication`: API key authentication for HTTP endpoints
- `http-configuration`: Environment variable configuration for HTTP server settings
- `dual-mode-operation`: Support for both stdio and HTTP transports simultaneously

### Modified Capabilities
- None (no existing capabilities are being modified at the requirement level)

## Impact

- **Code Changes**: `src/index.ts` (transport replacement and HTTP server setup)
- **Configuration**: New environment variables (`PORT`, `HTTP_AUTH_TOKEN`)
- **Dependencies**: No new dependencies required (MCP SDK already includes HTTP transport)
- **API Compatibility**: All existing tools remain unchanged
- **Deployment**: New deployment options (Docker, cloud hosting, reverse proxy)
- **Security**: New authentication requirements for HTTP access