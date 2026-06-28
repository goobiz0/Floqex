"use client";

import { useEffect, useState } from "react";

export type LiveAgentEvent = { id: string; t: string; kind: string; message: string };
export type LivePosition = {
  id: string;
  instrument: string;
  direction: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  sizeUnits: number;
  openedAt: string;
} | null;
export type LiveTrade = {
  id: string;
  instrument: string;
  direction: string;
  status: string;
  entryPrice: number;
  exitPrice: number | null;
  sizeUnits: number;
  netPnl: number | null;
  rMultiple: number | null;
  openedAt: string;
  closedAt: string | null;
};

export type LiveState = {
  connected: boolean;
  balance: number | null;
  botStatus: string | null;
  engineStatus: "ONLINE" | "DEGRADED" | "OFFLINE" | null;
  lastHeartbeat: string | null;
  events: LiveAgentEvent[];
  position: LivePosition;
  closedTrades: LiveTrade[];
  lastUpdate: number | null;
};

type Seed = {
  events?: LiveAgentEvent[];
  position?: LivePosition;
  closedTrades?: LiveTrade[];
  balance?: number | null;
  botStatus?: string | null;
};

/**
 * Subscribe to the live SSE stream for an account. Pass `enabled: false` to keep
 * the connection closed (used by the opt-in live toggle on the trades tab). The
 * connection auto-reconnects via the browser's EventSource; we merge new events
 * into the seeded server state so the first paint is never empty.
 */
export function useLiveStream(accountId: string | null, enabled: boolean, seed: Seed = {}): LiveState {
  const [state, setState] = useState<LiveState>({
    connected: false,
    balance: seed.balance ?? null,
    botStatus: seed.botStatus ?? null,
    engineStatus: null,
    lastHeartbeat: null,
    events: seed.events ?? [],
    position: seed.position ?? null,
    closedTrades: seed.closedTrades ?? [],
    lastUpdate: null,
  });

  useEffect(() => {
    if (!enabled || !accountId) return;

    const es = new EventSource(`/api/stream/${accountId}`);

    es.addEventListener("open", () => setState((s) => ({ ...s, connected: true })));
    es.addEventListener("error", () => setState((s) => ({ ...s, connected: false })));

    es.addEventListener("heartbeat", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setState((s) => ({
        ...s,
        connected: true,
        balance: d.balance ?? s.balance,
        botStatus: d.botStatus ?? s.botStatus,
        engineStatus: d.engineStatus ?? s.engineStatus,
        lastHeartbeat: d.lastHeartbeat ?? s.lastHeartbeat,
        lastUpdate: d.ts ?? Date.now(),
      }));
    });

    es.addEventListener("agent", (e) => {
      const incoming: LiveAgentEvent[] = JSON.parse((e as MessageEvent).data);
      setState((s) => {
        const seen = new Set(s.events.map((x) => x.id));
        const merged = [...s.events, ...incoming.filter((x) => !seen.has(x.id))];
        return { ...s, events: merged.slice(-100) };
      });
    });

    es.addEventListener("position", (e) => {
      const d = JSON.parse((e as MessageEvent).data) as LivePosition;
      setState((s) => ({ ...s, position: d }));
    });

    es.addEventListener("trades", (e) => {
      const d: LiveTrade[] = JSON.parse((e as MessageEvent).data);
      setState((s) => ({ ...s, closedTrades: d }));
    });

    return () => es.close();
  }, [accountId, enabled]);

  return state;
}
