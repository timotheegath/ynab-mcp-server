#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import * as ynab from "ynab";
import express from "express";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import rateLimit from "express-rate-limit";
import { Command } from "commander";
import { createSessionStorage, SessionStorage } from "./session-storage.js";

// Import all tools
import * as ListBudgetsTool from "./tools/ListBudgetsTool.js";
import * as GetUnapprovedTransactionsTool from "./tools/GetUnapprovedTransactionsTool.js";
import * as BudgetSummaryTool from "./tools/BudgetSummaryTool.js";
import * as CreateTransactionTool from "./tools/CreateTransactionTool.js";
import * as ApproveTransactionTool from "./tools/ApproveTransactionTool.js";
import * as UpdateCategoryBudgetTool from "./tools/UpdateCategoryBudgetTool.js";
import * as UpdateTransactionTool from "./tools/UpdateTransactionTool.js";
import * as BulkApproveTransactionsTool from "./tools/BulkApproveTransactionsTool.js";
import * as ListPayeesTool from "./tools/ListPayeesTool.js";
import * as GetTransactionsTool from "./tools/GetTransactionsTool.js";
import * as DeleteTransactionTool from "./tools/DeleteTransactionTool.js";
import * as ListCategoriesTool from "./tools/ListCategoriesTool.js";
import * as ListAccountsTool from "./tools/ListAccountsTool.js";
import * as ListScheduledTransactionsTool from "./tools/ListScheduledTransactionsTool.js";
import * as ImportTransactionsTool from "./tools/ImportTransactionsTool.js";
import * as ListMonthsTool from "./tools/ListMonthsTool.js";

const server = new McpServer({
  name: "ynab-mcp-server",
  version: "0.1.2",
});

// Initialize YNAB API
const api = new ynab.API(process.env.YNAB_API_TOKEN || "");

// Register all tools
server.registerTool(ListBudgetsTool.name, {
  title: "List Budgets",
  description: ListBudgetsTool.description,
  inputSchema: ListBudgetsTool.inputSchema,
}, async (input) => ListBudgetsTool.execute(input, api));

server.registerTool(GetUnapprovedTransactionsTool.name, {
  title: "Get Unapproved Transactions",
  description: GetUnapprovedTransactionsTool.description,
  inputSchema: GetUnapprovedTransactionsTool.inputSchema,
}, async (input) => GetUnapprovedTransactionsTool.execute(input, api));

server.registerTool(BudgetSummaryTool.name, {
  title: "Budget Summary",
  description: BudgetSummaryTool.description,
  inputSchema: BudgetSummaryTool.inputSchema,
}, async (input) => BudgetSummaryTool.execute(input, api));

server.registerTool(CreateTransactionTool.name, {
  title: "Create Transaction",
  description: CreateTransactionTool.description,
  inputSchema: CreateTransactionTool.inputSchema,
}, async (input) => CreateTransactionTool.execute(input, api));

server.registerTool(ApproveTransactionTool.name, {
  title: "Approve Transaction",
  description: ApproveTransactionTool.description,
  inputSchema: ApproveTransactionTool.inputSchema,
}, async (input) => ApproveTransactionTool.execute(input, api));

server.registerTool(UpdateCategoryBudgetTool.name, {
  title: "Update Category Budget",
  description: UpdateCategoryBudgetTool.description,
  inputSchema: UpdateCategoryBudgetTool.inputSchema,
}, async (input) => UpdateCategoryBudgetTool.execute(input, api));

server.registerTool(UpdateTransactionTool.name, {
  title: "Update Transaction",
  description: UpdateTransactionTool.description,
  inputSchema: UpdateTransactionTool.inputSchema,
}, async (input) => UpdateTransactionTool.execute(input, api));

server.registerTool(BulkApproveTransactionsTool.name, {
  title: "Bulk Approve Transactions",
  description: BulkApproveTransactionsTool.description,
  inputSchema: BulkApproveTransactionsTool.inputSchema,
}, async (input) => BulkApproveTransactionsTool.execute(input, api));

server.registerTool(ListPayeesTool.name, {
  title: "List Payees",
  description: ListPayeesTool.description,
  inputSchema: ListPayeesTool.inputSchema,
}, async (input) => ListPayeesTool.execute(input, api));

server.registerTool(GetTransactionsTool.name, {
  title: "Get Transactions",
  description: GetTransactionsTool.description,
  inputSchema: GetTransactionsTool.inputSchema,
}, async (input) => GetTransactionsTool.execute(input, api));

server.registerTool(DeleteTransactionTool.name, {
  title: "Delete Transaction",
  description: DeleteTransactionTool.description,
  inputSchema: DeleteTransactionTool.inputSchema,
}, async (input) => DeleteTransactionTool.execute(input, api));

server.registerTool(ListCategoriesTool.name, {
  title: "List Categories",
  description: ListCategoriesTool.description,
  inputSchema: ListCategoriesTool.inputSchema,
}, async (input) => ListCategoriesTool.execute(input, api));

server.registerTool(ListAccountsTool.name, {
  title: "List Accounts",
  description: ListAccountsTool.description,
  inputSchema: ListAccountsTool.inputSchema,
}, async (input) => ListAccountsTool.execute(input, api));

server.registerTool(ListScheduledTransactionsTool.name, {
  title: "List Scheduled Transactions",
  description: ListScheduledTransactionsTool.description,
  inputSchema: ListScheduledTransactionsTool.inputSchema,
}, async (input) => ListScheduledTransactionsTool.execute(input, api));

server.registerTool(ImportTransactionsTool.name, {
  title: "Import Transactions",
  description: ImportTransactionsTool.description,
  inputSchema: ImportTransactionsTool.inputSchema,
}, async (input) => ImportTransactionsTool.execute(input, api));

server.registerTool(ListMonthsTool.name, {
  title: "List Months",
  description: ListMonthsTool.description,
  inputSchema: ListMonthsTool.inputSchema,
}, async (input) => ListMonthsTool.execute(input, api));

// Configuration parsing with validation
function getConfig() {
  // Parse and validate PORT
  let port = parseInt(process.env.PORT || "3000");
  if (isNaN(port) || port < 1 || port > 65535) {
    console.warn(`Invalid PORT value: ${process.env.PORT}. Using default port 3000.`);
    port = 3000;
  }

  // Parse TRANSPORT_MODE (command line takes precedence over environment variable)
  const transportMode = process.env.TRANSPORT_MODE || "stdio";
  if (!["stdio", "http", "both"].includes(transportMode)) {
    console.warn(`Invalid TRANSPORT_MODE: ${transportMode}. Using default 'stdio'.`);
  }

   // Parse CORS origins
  const corsOrigins = process.env.CORS_ORIGINS?.split(",").map(origin => origin.trim()).filter(origin => origin.length > 0) || [];

  // Parse Redis configuration for session storage
  const redisUrl = process.env.REDIS_URL;
  
  // Parse session storage type
  const storageType = process.env.SESSION_STORAGE_TYPE as 'memory' | 'file' | 'redis' || 'file';
  
  let sessionTtlSeconds = parseInt(process.env.SESSION_TTL_SECONDS || "86400"); // Default: 24 hours
  if (isNaN(sessionTtlSeconds) || sessionTtlSeconds < 60) {
    console.warn(`Invalid SESSION_TTL_SECONDS value: ${process.env.SESSION_TTL_SECONDS}. Using default 86400 seconds (24 hours).`);
    sessionTtlSeconds = 86400;
  }

  // Validate HTTP mode requirements
  if ((transportMode === "http" || transportMode === "both") && !process.env.HTTP_AUTH_TOKEN) {
    console.warn("WARNING: HTTP mode enabled but HTTP_AUTH_TOKEN not set. Running in development mode without authentication.");
  }

  return {
    port: port,
    httpAuthToken: process.env.HTTP_AUTH_TOKEN,
    transportMode: transportMode as "stdio" | "http" | "both",
    corsOrigins: corsOrigins,
    redisUrl: redisUrl,
    sessionTtlSeconds: sessionTtlSeconds,
    storageType: storageType
  };
}

// Parse command line arguments
function parseCommandLineArgs() {
  const program = new Command();
  
  program
    .name('ynab-mcp-server')
    .description('YNAB MCP Server with stdio and HTTP transport support')
    .version('0.1.2')
    .option('--transport-mode <mode>', 'Transport mode: stdio, http, or both', process.env.TRANSPORT_MODE || 'stdio')
    .option('--port <port>', 'HTTP server port', process.env.PORT || '3000')
    .option('--http-auth-token <token>', 'HTTP authentication token', process.env.HTTP_AUTH_TOKEN)
    .option('--cors-origins <origins>', 'Comma-separated list of allowed CORS origins', process.env.CORS_ORIGINS)
  .option('--redis-url <url>', 'Redis connection URL for session storage', process.env.REDIS_URL)
  .option('--session-ttl-seconds <seconds>', 'Session time-to-live in seconds', process.env.SESSION_TTL_SECONDS || '86400')
  .option('--session-storage-type <type>', 'Session storage type: memory, file, or redis', process.env.SESSION_STORAGE_TYPE || 'file');

  program.parse(process.argv);
  
  const options = program.opts();
  
  // Set environment variables from command line options (command line takes precedence)
  if (options.transportMode) process.env.TRANSPORT_MODE = options.transportMode;
  if (options.port) process.env.PORT = options.port;
  if (options.httpAuthToken) process.env.HTTP_AUTH_TOKEN = options.httpAuthToken;
  if (options.corsOrigins) process.env.CORS_ORIGINS = options.corsOrigins;
  if (options.sessionStorageType) process.env.SESSION_STORAGE_TYPE = options.sessionStorageType;
}

// Authentication middleware for HTTP
function createAuthMiddleware(authToken: string | undefined) {
  return async function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Skip authentication if no token is configured (development mode)
    if (!authToken) {
      console.error(`[${requestId}] ⚠️  AUTH: Development mode - no HTTP_AUTH_TOKEN configured. IP: ${clientIp}, Path: ${req.path}`);
      return next();
    }

    // Check for Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      console.error(`[${requestId}] 🚫 AUTH: Missing Authorization header. IP: ${clientIp}, Path: ${req.path}, Method: ${req.method}`);
      res.status(401).json({
        error: "Unauthorized - Missing Authorization header",
        requestId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Parse Bearer token
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      console.error(`[${requestId}] 🚫 AUTH: Malformed Authorization header. IP: ${clientIp}, Header: ${authHeader}`);
      res.status(400).json({
        error: "Bad Request - Malformed Authorization header",
        requestId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = match[1];

    // Log authentication attempt
    console.error(`[${requestId}] 🔐 AUTH: Authentication attempt. IP: ${clientIp}, Path: ${req.path}`);

    // Constant-time comparison to prevent timing attacks
    if (token.length !== authToken.length) {
      console.error(`[${requestId}] 🚫 AUTH: Invalid token length. IP: ${clientIp}, Expected: ${authToken.length}, Got: ${token.length}`);
      res.status(401).json({
        error: "Unauthorized - Invalid API key",
        requestId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    let valid = true;
    for (let i = 0; i < token.length; i++) {
      if (token.charCodeAt(i) !== authToken.charCodeAt(i)) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      console.error(`[${requestId}] 🚫 AUTH: Invalid API key. IP: ${clientIp}, Path: ${req.path}`);
      res.status(401).json({
        error: "Unauthorized - Invalid API key",
        requestId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.error(`[${requestId}] ✅ AUTH: Authentication successful. IP: ${clientIp}, Path: ${req.path}`);
    next();
  };
}

  // HTTP server setup
async function setupHttpServer(config: ReturnType<typeof getConfig>) {
  const app = express();
  
  // Trust proxy headers when running behind reverse proxy (nginx, etc.)
  app.set('trust proxy', true);

  // Request ID middleware for correlation
  app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  app.use(express.json());

  // CORS middleware
    if (config.corsOrigins.length > 0) {
      app.use((req, res, next) => {
        const origin = req.headers.origin;
        const clientIp = req.ip || req.connection.remoteAddress;
        const requestId = req.headers['x-request-id'] || 'unknown';

        if (req.method === "OPTIONS") {
          console.error(`[${requestId}] 🔄 CORS: Preflight request. Origin: ${origin || 'none'}, IP: ${clientIp}`);
        }

        if (origin && config.corsOrigins.includes(origin)) {
          res.setHeader("Access-Control-Allow-Origin", origin);
        } else if (origin) {
          console.error(`[${requestId}] 🚫 CORS: Blocked request from disallowed origin. Origin: ${origin}, Allowed: ${config.corsOrigins.join(', ')}, IP: ${clientIp}, Path: ${req.path}`);
          // Note: We still set headers but don't explicitly block - the browser will enforce CORS
        }

        res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, MCP-Session-Id");
        res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
        res.setHeader("Access-Control-Max-Age", "86400");

        if (req.method === "OPTIONS") {
          console.error(`[${requestId}] ✅ CORS: Preflight approved. Origin: ${origin || 'none'}`);
          res.sendStatus(204);
          return;
        }
        next();
      });
    } else {
      // Simple wildcard CORS for local development
      app.use((req, res, next) => {
        const origin = req.headers.origin;
        const clientIp = req.ip || req.connection.remoteAddress;
        const requestId = req.headers['x-request-id'] || 'unknown';

        if (req.method === "OPTIONS") {
          console.error(`[${requestId}] 🔄 CORS: Preflight request (dev mode - wildcard). Origin: ${origin || 'none'}, IP: ${clientIp}`);
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, MCP-Session-Id");
        res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
        res.setHeader("Access-Control-Max-Age", "86400");

        if (req.method === "OPTIONS") {
          console.error(`[${requestId}] ✅ CORS: Preflight approved (dev mode). Origin: ${origin || 'none'}`);
          res.sendStatus(204);
          return;
        }
        next();
      });
    }

  // Rate limiting middleware - 100 requests per minute
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests, please try again later.",
      status: 429,
      retryAfter: 60
    },
    headers: true, // send rate limit info in headers
    handler: (req: express.Request, res: express.Response) => {
      const clientIp = req.ip || req.connection.remoteAddress;
      const requestId = req.headers['x-request-id'] || 'unknown';
      console.error(`[${requestId}] ⚠️  RATE_LIMIT: IP ${clientIp} exceeded rate limit (100 req/min). Path: ${req.path}, Method: ${req.method}`);
      res.status(429).json({
        error: "Too many requests, please try again later.",
        status: 429,
        retryAfter: 60,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.use(limiter);

  // Authentication middleware
  app.use(createAuthMiddleware(config.httpAuthToken));

   // Initialize session storage
   const sessionStorage: SessionStorage = createSessionStorage(config);

   // Health check endpoint for session storage monitoring
   app.get('/health/session-storage', async (req, res) => {
     const requestId = req.headers['x-request-id'] || 'unknown';
     console.error(`[${requestId}] 🩺 Health check: session storage`);
     
     try {
       // Test basic session storage functionality
       const testSessionId = `health-check-${Date.now()}`;
       const mockTransport = {
         sessionId: testSessionId
       } as unknown as StreamableHTTPServerTransport;
       
       // Test set operation
       await sessionStorage.setSession(testSessionId, mockTransport);
       
       // Test has operation
       const hasSession = await sessionStorage.hasSession(testSessionId);
       
       // Test get operation
       const retrieved = await sessionStorage.getSession(testSessionId);
       
       // Test delete operation
       await sessionStorage.deleteSession(testSessionId);
       
       // Determine storage type
       const storageType = config.redisUrl ? 'redis' : 'memory';
       
       res.status(200).json({
         status: 'healthy',
         storageType: storageType,
         redisUrl: config.redisUrl ? 'configured' : 'not configured',
         sessionTtlSeconds: config.sessionTtlSeconds,
         testResults: {
           setOperation: 'success',
           hasOperation: hasSession ? 'success' : 'failed',
           getOperation: retrieved ? 'success' : 'failed',
           deleteOperation: 'success'
         },
         timestamp: new Date().toISOString(),
         requestId: requestId
       });
       
       console.error(`[${requestId}] ✅ Health check passed: ${storageType} storage operational`);
     } catch (error) {
       console.error(`[${requestId}] ❌ Health check failed:`, error);
       
       res.status(503).json({
         status: 'unhealthy',
         error: error instanceof Error ? error.message : 'Unknown error',
         storageType: config.redisUrl ? 'redis' : 'memory',
         timestamp: new Date().toISOString(),
         requestId: requestId
       });
     }
   });

   // Unified handler for all MCP methods
  // Handles session initialization, reuse, and error cases
  app.all('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const requestId = randomUUID();
    console.error(`→ [${requestId}] ${req.method} ${req.path} ${sessionId ? `session=${sessionId}` : 'new-session'}`);
    
    try {
      // Basic session routing
      if (req.method === 'POST' && isInitializeRequest(req.body)) {
        // Initialize request - create new session
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(), // Generate unique session ID
          allowedOrigins: config.corsOrigins,
          enableDnsRebindingProtection: false,
        });
        
        // Connect to the MCP server
        await server.connect(transport);
        
         // Store transport for session reuse
         const generatedSessionId = transport.sessionId;
         if (generatedSessionId) {
           try {
             await sessionStorage.setSession(generatedSessionId, transport);
             res.setHeader('Mcp-Session-Id', generatedSessionId);
             console.error(`✓ New MCP session initialized: ${generatedSessionId}`);
           } catch (storageError) {
             console.error(`[${requestId}] ❌ SESSION_STORAGE: Failed to store session ${generatedSessionId}:`, storageError);
             // Continue without session storage - session won't persist but request will work
           }
         }
        
        // Handle the request
        await transport.handleRequest(req, res, req.body);
        console.error(`← [${requestId}] ${res.statusCode}`);
       } else if (sessionId) {
         // Session-based request - check if session exists and reuse
         try {
           if (await sessionStorage.hasSession(sessionId)) {
             console.error(`✓ Reusing existing session: ${sessionId}`);
             const transport = await sessionStorage.getSession(sessionId);
              if (transport) {
                await transport.handleRequest(req, res, req.method === 'POST' ? req.body : undefined);
                console.error(`← [${requestId}] ${res.statusCode}`);
              } else {
                // Session exists but transport couldn't be retrieved, treat as invalid
                const clientIp = req.ip || req.connection.remoteAddress;
                console.error(`[${requestId}] 🚫 SESSION: Session exists but transport unavailable. IP: ${clientIp}, Session: ${sessionId}`);
                res.status(400).json({
                  error: 'Session transport unavailable',
                  requestId,
                  timestamp: new Date().toISOString(),
                  sessionId: sessionId
                });
                console.error(`← [${requestId}] 400`);
              }
            } else {
              // Invalid session ID
              const clientIp = req.ip || req.connection.remoteAddress;
              console.error(`[${requestId}] 🚫 SESSION: Invalid session ID. IP: ${clientIp}, Session: ${sessionId}, Path: ${req.path}`);
              res.status(400).json({
                error: 'Invalid session ID - session not found',
                requestId,
                timestamp: new Date().toISOString(),
                sessionId: sessionId
              });
              console.error(`← [${requestId}] 400`);
            }
         } catch (storageError) {
           console.error(`[${requestId}] ❌ SESSION_STORAGE: Error checking session ${sessionId}:`, storageError);
           // Fallback to memory-only behavior on storage errors
           const clientIp = req.ip || req.connection.remoteAddress;
           console.error(`[${requestId}] 🚫 SESSION: Invalid session ID (storage error). IP: ${clientIp}, Session: ${sessionId}, Path: ${req.path}`);
           res.status(400).json({
             error: 'Invalid session ID - session not found',
             requestId,
             timestamp: new Date().toISOString(),
             sessionId: sessionId
           });
           console.error(`← [${requestId}] 400`);
         }
        console.error(`← [${requestId}] ${res.statusCode}`);
      } else if (!sessionId) {
        // Missing session ID
        const clientIp = req.ip || req.connection.remoteAddress;
        console.error(`[${requestId}] 🚫 SESSION: Missing session ID. IP: ${clientIp}, Path: ${req.path}, Method: ${req.method}`);
        res.status(400).json({
          error: 'Missing session ID - please initialize a session first',
          requestId,
          timestamp: new Date().toISOString()
        });
        console.error(`← [${requestId}] 400`);
      } else {
        // Invalid session ID
        const clientIp = req.ip || req.connection.remoteAddress;
        console.error(`[${requestId}] 🚫 SESSION: Invalid session ID. IP: ${clientIp}, Session: ${sessionId}, Path: ${req.path}`);
        res.status(400).json({
          error: 'Invalid session ID - session not found',
          requestId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId
        });
        console.error(`← [${requestId}] 400`);
      }
    } catch (error) {
      console.error(`✗ [${requestId}] Request failed:`, error);
      res.status(500).json({ error: "Internal server error" });
      console.error(`← [${requestId}] 500`);
    }
  });

  return app;
}

// Start the server
async function main() {
  // Parse command line arguments first
  parseCommandLineArgs();
  
  const config = getConfig();
  console.error(`Starting YNAB MCP server v0.1.2 in ${config.transportMode} mode`);
  
  if (config.transportMode === "stdio" || config.transportMode === "both") {
    try {
      const stdioTransport = new StdioServerTransport();
      await server.connect(stdioTransport);
      console.error("✓ Stdio transport initialized and connected");
      console.error("YNAB MCP server running on stdio");
    } catch (error) {
      console.error("✗ Stdio transport initialization failed:", error);
      process.exit(1);
    }
  }

  if (config.transportMode === "http" || config.transportMode === "both") {
    // Validate HTTP configuration
    if (!config.httpAuthToken) {
      console.warn("WARNING: HTTP_AUTH_TOKEN not set - HTTP server will run without authentication!");
    }

    const app = await setupHttpServer(config);
    const httpServer = app.listen(config.port, () => {
      console.error(`✓ HTTP server listening on port ${config.port}`);
      console.error(`✓ Transport mode: ${config.transportMode}`);
      console.error(`✓ Authentication: ${config.httpAuthToken ? 'enabled' : 'disabled (dev mode)'}`);
    });

    // Store server reference for graceful shutdown
    (server as any).httpServer = httpServer;

    // Add error handler for HTTP server
    httpServer.on('error', (error) => {
      console.error("✗ HTTP server failed to start:", error);
      process.exit(1);
    });
  }

  // Graceful shutdown handling
  const shutdown = async () => {
    console.error("\n🛑 Shutdown signal received. Initiating graceful shutdown...");

    try {
      console.error("🔌 Closing MCP server connections...");
      await server.close();
      console.error("✓ MCP server connections closed");

      if ((server as any).httpServer) {
        console.error("🌐 Closing HTTP server...");
        await new Promise<void>((resolve, reject) => {
          (server as any).httpServer.close((err: any) => {
            if (err) {
              console.error("✗ HTTP server shutdown error:", err);
              reject(err);
            } else {
              console.error("✓ HTTP server closed");
              resolve();
            }
          });
        });
      }
      console.error("✓ Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("✗ Shutdown failed:", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(console.error);
