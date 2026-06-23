#!/usr/bin/env node
/**
 * Floqex Model Context Protocol (MCP) Server
 * Usage: node floqex-mcp.js --key=YOUR_API_KEY
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const args = process.argv.slice(2);
const keyArg = args.find(a => a.startsWith("--key="));
const API_KEY = keyArg ? keyArg.split("=")[1] : process.env.FLOQEX_MCP_KEY;

if (!API_KEY) {
  console.error("Error: Missing --key. Please run with --key=YOUR_API_KEY or set FLOQEX_MCP_KEY env var.");
  process.exit(1);
}

const API_BASE = "https://floqex.com/api/v1/mcp";

// Helper to call Floqex API
async function callFloqexApi(action, method = "GET", body = null) {
  const url = `${API_BASE}?action=${action}`;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Floqex API error: ${res.statusText}`);
  }
  return res.json();
}

const server = new Server(
  { name: "floqex", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_overview",
        description: "Get the user's Floqex account balances, active bots, and recent trades.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "adjust_strategy",
        description: "Programmatically adjust a parameter on a user's trading bot strategy.",
        inputSchema: {
          type: "object",
          properties: {
            strategyId: { type: "string", description: "The ID of the strategy to modify" },
            paramKey: { type: "string", description: "The parameter key to adjust (e.g. riskPct, rrTarget)" },
            newValue: { type: "string", description: "The new value for the parameter" }
          },
          required: ["strategyId", "paramKey", "newValue"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "get_overview") {
      const data = await callFloqexApi("overview");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (request.params.name === "adjust_strategy") {
      const args = request.params.arguments;
      const data = await callFloqexApi("adjust", "POST", args);
      return {
        content: [{ type: "text", text: `Success: ${JSON.stringify(data, null, 2)}` }]
      };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
