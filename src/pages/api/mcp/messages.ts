import type { NextApiRequest, NextApiResponse } from "next";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

declare global {
  var mcpTransports: Map<string, SSEServerTransport> | undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  const transport = global.mcpTransports?.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "Session not found" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await transport.handlePostMessage(req as any, res as any);
}
