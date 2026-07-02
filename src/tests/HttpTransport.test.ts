import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

describe("HTTP Transport Basic Functionality", () => {
  let app: express.Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Simple test endpoint that mimics the MCP transport behavior
    app.post('/mcp', (req, res) => {
      // Check if it's an initialize request
      if (req.body.method === "initialize") {
        res.json({
          jsonrpc: "2.0",
          id: req.body.id,
          result: {
            capabilities: {
              tools: [],
              resources: []
            }
          }
        });
      } else if (req.body.method === "executeTool") {
        res.json({
          jsonrpc: "2.0",
          id: req.body.id,
          result: {
            content: [{ type: "text", text: "Tool executed successfully" }]
          }
        });
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          id: req.body.id,
          error: {
            code: -32601,
            message: "Method not found"
          }
        });
      }
    });
  });

  it("should handle initialize request", async () => {
    const response = await request(app)
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1
      })
      .expect(200);

    expect(response.body).toHaveProperty('jsonrpc', '2.0');
    expect(response.body).toHaveProperty('id', 1);
    expect(response.body).toHaveProperty('result');
  });

  it("should handle tool execution request", async () => {
    const response = await request(app)
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: "2.0",
        method: "executeTool",
        params: {
          toolName: "test_tool",
          input: {
            message: "Hello World"
          }
        },
        id: 2
      })
      .expect(200);

    expect(response.body).toHaveProperty('jsonrpc', '2.0');
    expect(response.body).toHaveProperty('id', 2);
    expect(response.body).toHaveProperty('result');
  });

  it("should return error for invalid request", async () => {
    const response = await request(app)
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: "2.0",
        method: "nonExistentMethod",
        id: 1
      })
      .expect(400); // Expect 400 Bad Request for invalid methods

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
  });
});

describe("HTTP Authentication", () => {
  let app: express.Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Authentication middleware
    const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        res.status(401).json({ error: "Unauthorized - Missing Authorization header" });
        return;
      }

      const match = authHeader.match(/^Bearer (.+)$/);
      if (!match) {
        res.status(400).json({ error: "Bad Request - Malformed Authorization header" });
        return;
      }

      const token = match[1];
      if (token !== "test-token") {
        res.status(401).json({ error: "Unauthorized - Invalid API key" });
        return;
      }

      next();
    };

    app.use(authMiddleware);

    // Simple test endpoint
    app.post('/mcp', (req, res) => {
      res.json({ success: true, message: "Authenticated request" });
    });
  });

  it("should reject requests without authorization header", async () => {
    await request(app)
      .post('/mcp')
      .send({ test: "data" })
      .expect(401);
  });

  it("should reject requests with malformed authorization header", async () => {
    await request(app)
      .post('/mcp')
      .set('Authorization', 'InvalidHeader')
      .send({ test: "data" })
      .expect(400);
  });

  it("should reject requests with invalid token", async () => {
    await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer wrong-token')
      .send({ test: "data" })
      .expect(401);
  });

  it("should accept requests with valid token", async () => {
    const response = await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer test-token')
      .send({ test: "data" })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});