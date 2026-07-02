## 1. Basic Setup

- [x] 1.1 Create simple transports map for session storage
- [x] 1.2 Replace POST/GET/DELETE handlers with single app.all('/mcp') handler

## 2. Simple Transport Configuration

- [x] 2.1 Change sessionIdGenerator to () => randomUUID()
- [x] 2.2 Add basic transport storage when session initialized

## 3. Basic Session Handling

- [x] 3.1 Implement simple session routing in unified handler
- [x] 3.2 Add basic session ID validation
- [x] 3.3 Implement transport reuse for valid sessions

## 4. Minimal Security

- [x] 4.1 Add basic CORS header to expose Mcp-Session-Id
- [x] 4.2 Use simple wildcard CORS for local development

## 5. Simple Error Handling

- [x] 5.1 Add basic error response for missing session IDs
- [x] 5.2 Add simple error for invalid session IDs

## 6. Basic Testing

- [x] 6.1 Manual test: Initialize session and check session ID
- [x] 6.2 Manual test: Reuse session for tool execution
- [x] 6.3 Manual test: Establish SSE stream with valid session
- [x] 6.4 Manual test: Verify error handling

## 7. Cleanup

- [x] 7.1 Verify existing tools still work
- [x] 7.2 Update README with basic session info
- [x] 7.3 Add simple comments for session handling
