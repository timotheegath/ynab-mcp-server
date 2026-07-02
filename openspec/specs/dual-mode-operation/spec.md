## ADDED Requirements

### Requirement: Dual Transport Support
The system SHALL support simultaneous stdio and HTTP transport modes.

#### Scenario: Both Transports Enabled
- **WHEN** `TRANSPORT_MODE` is set to `both`
- **THEN** both stdio and HTTP transports SHALL be initialized
- **AND** both SHALL process requests independently

#### Scenario: Independent Operation
- **WHEN** both transports are enabled
- **AND** a request comes via stdio
- **THEN** the HTTP transport SHALL NOT be affected
- **AND** vice versa

### Requirement: Transport Selection
The system SHALL allow selection of transport mode via configuration.

#### Scenario: Default Transport Mode
- **WHEN** `TRANSPORT_MODE` is not set
- **THEN** the system SHALL default to `stdio` mode
- **TO** maintain backward compatibility

#### Scenario: Command Line Override
- **WHEN** `--transport-mode` command line flag is provided
- **THEN** it SHALL override the `TRANSPORT_MODE` environment variable

### Requirement: Shared Server Instance
Both transports SHALL share the same MCP server instance and tool registry.

#### Scenario: Tool Registry Sharing
- **WHEN** a tool is registered with the MCP server
- **THEN** it SHALL be available via both stdio and HTTP transports

#### Scenario: State Sharing
- **WHEN** server state changes via one transport
- **THEN** the change SHALL be visible via the other transport

### Requirement: Graceful Shutdown
The system SHALL support graceful shutdown in dual-mode operation.

#### Scenario: SIGTERM Handling
- **WHEN** the process receives SIGTERM
- **THEN** both transports SHALL stop accepting new requests
- **AND** in-progress requests SHALL be allowed to complete
- **AND** the process SHALL exit cleanly

#### Scenario: HTTP Server Shutdown
- **WHEN** shutdown is initiated
- **THEN** the HTTP server SHALL close gracefully
- **AND** stdio transport SHALL also terminate cleanly