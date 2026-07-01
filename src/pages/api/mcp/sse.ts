import type { NextApiRequest, NextApiResponse } from "next";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpServer } from "@/lib/mcp";

import { checkRateLimit } from "@/lib/ratelimit";

// Global map to hold active transports by sessionId
declare global {
  var mcpTransports: Map<string, SSEServerTransport> | undefined;
}

if (!global.mcpTransports) {
  global.mcpTransports = new Map();
}

const transports = global.mcpTransports;

async function authenticate(req: NextApiRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.split(" ")[1];

  const match = key.match(/^fqx_mcp_(user_[a-zA-Z0-9]+)_/);
  if (!match) return null;
  const clerkId = match[1];

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  try {
    const clerkUser = await client.users.getUser(clerkId);
    if (clerkUser.privateMetadata.mcpKey !== key) return null;
    return clerkId;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || "127.0.0.1";
  const rateLimitSuccess = await checkRateLimit(`mcp_sse_${ip}`, 30, "1 m");
  if (!rateLimitSuccess) return res.status(429).json({ error: "Rate limit exceeded" });

  const clerkId = await authenticate(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // The client will POST to /api/mcp/messages?sessionId=...
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transport = new SSEServerTransport("/api/mcp/messages", res as any);
  
  await mcpServer.connect(transport);
  
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });
}
