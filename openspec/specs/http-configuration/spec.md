## ADDED Requirements

### Requirement: Environment Variable Configuration
The system SHALL support configuration via environment variables for HTTP settings.

#### Scenario: Port Configuration
- **WHEN** `PORT` environment variable is set
- **THEN** the HTTP server SHALL listen on the specified port
- **AND** if not set, SHALL default to port 3000

#### Scenario: Authentication Token Configuration
- **WHEN** `HTTP_AUTH_TOKEN` environment variable is set
- **THEN** the authentication system SHALL use this token for validation
- **AND** if not set, HTTP authentication SHALL be disabled (for development only)

#### Scenario: Transport Mode Configuration
- **WHEN** `TRANSPORT_MODE` is set to `stdio`
- **THEN** only stdio transport SHALL be enabled

#### Scenario: Dual Mode Configuration
- **WHEN** `TRANSPORT_MODE` is set to `both`
- **THEN** both stdio and HTTP transports SHALL be enabled simultaneously

#### Scenario: HTTP Only Mode
- **WHEN** `TRANSPORT_MODE` is set to `http`
- **THEN** only HTTP transport SHALL be enabled

### Requirement: CORS Configuration
The system SHALL support CORS configuration for web client access.

#### Scenario: CORS Origins Configuration
- **WHEN** `CORS_ORIGINS` environment variable is set
- **THEN** the HTTP server SHALL allow requests from the specified origins
- **AND** the `Access-Control-Allow-Origin` header SHALL be set accordingly

#### Scenario: Default CORS Behavior
- **WHEN** `CORS_ORIGINS` is not set
- **THEN** the HTTP server SHALL NOT include CORS headers
- **AND** only same-origin requests SHALL be allowed

### Requirement: Configuration Validation
The system SHALL validate configuration before starting.

#### Scenario: Invalid Port
- **WHEN** `PORT` is set to an invalid value
- **THEN** the server SHALL log an error
- **AND** SHALL fall back to default port 3000

#### Scenario: Missing Required Configuration
- **WHEN** `TRANSPORT_MODE` includes `http`
- **AND** `HTTP_AUTH_TOKEN` is not set
- **THEN** the server SHALL log a warning
- **AND** SHALL start in development mode with authentication disabled