import type { NextApiRequest, NextApiResponse } from "next";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

declare global {
  var mcpTransports: Map<string, SSEServerTransport> | undefined;
}

const SessionQuerySchema = z.object({
  sessionId: z.string().max(100).regex(/^[a-zA-Z0-9_-]+$/),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || "127.0.0.1";
  const rateLimitSuccess = await checkRateLimit(`mcp_messages_${ip}`, 100, "1 m");
  if (!rateLimitSuccess) return res.status(429).json({ error: "Rate limit exceeded" });

  const parsed = SessionQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { sessionId } = parsed.data;

  const transport = global.mcpTransports?.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "Session not found" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await transport.handlePostMessage(req as any, res as any);
}
