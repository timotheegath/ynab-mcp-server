## ADDED Requirements

### Requirement: API Key Authentication
The system SHALL require API key authentication for all HTTP endpoints.

#### Scenario: Valid API Key
- **WHEN** a request includes a valid `Authorization: Bearer <token>` header
- **AND** the token matches `HTTP_AUTH_TOKEN` environment variable
- **THEN** the request SHALL be processed normally

#### Scenario: Missing API Key
- **WHEN** a request is made without an `Authorization` header
- **THEN** the system SHALL return HTTP 401 Unauthorized
- **AND** the response body SHALL contain a JSON error message

#### Scenario: Invalid API Key
- **WHEN** a request includes an invalid `Authorization` header
- **THEN** the system SHALL return HTTP 401 Unauthorized
- **AND** the response body SHALL contain a JSON error message

#### Scenario: Malformed Authorization Header
- **WHEN** a request includes a malformed `Authorization` header
- **THEN** the system SHALL return HTTP 400 Bad Request
- **AND** the response body SHALL contain a JSON error message

### Requirement: Secure Token Storage
The system SHALL store authentication tokens securely.

#### Scenario: Environment Variable Loading
- **WHEN** the server starts
- **THEN** the `HTTP_AUTH_TOKEN` SHALL be loaded from environment variables
- **AND** the token SHALL NOT be logged or exposed in error messages

#### Scenario: Token Validation
- **WHEN** validating an API key
- **THEN** the comparison SHALL be done using constant-time comparison
- **TO** prevent timing attacks

### Requirement: Rate Limiting
The system SHALL implement basic rate limiting for HTTP endpoints.

#### Scenario: Excessive Requests
- **WHEN** a client makes more than 100 requests per minute
- **THEN** subsequent requests SHALL return HTTP 429 Too Many Requests
- **AND** the response SHALL include a `Retry-After` header

#### Scenario: Rate Limit Headers
- **WHEN** any authenticated request is made
- **THEN** the response SHALL include rate limit headers:
- `X-RateLimit-Limit`: Total allowed requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when limit resets