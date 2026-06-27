import type { Broker } from "@prisma/client";

/**
 * Single source of truth for which brokers Floqex can truly route real orders
 * to. Drives both the account-creation UI (so a user can't pick a broker that
 * would error at execution) and the live execution router. Keeping this list
 * here means the picker and the engine can never drift out of sync.
 *
 * `live`        - a real adapter exists (CCXT crypto, Alpaca, IBKR).
 * `coming-soon` - selectable surface exists but no real adapter yet, so it is
 *                 disabled in the UI rather than failing silently at fill time.
 */
export type BrokerStatus = "live" | "coming-soon";

export type BrokerType = "CRYPTO" | "TRADFI" | "FOREX" | "SIMULATION";

export type BrokerMeta = {
  id: Broker;
  name: string;
  type: BrokerType;
  requiresKeys: boolean;
  status: BrokerStatus;
};

export const BROKERS: BrokerMeta[] = [
  { id: "PAPER", name: "Floqex Simulator", type: "SIMULATION", requiresKeys: false, status: "live" },
  { id: "ALPACA", name: "Alpaca", type: "TRADFI", requiresKeys: true, status: "live" },
  { id: "IBKR", name: "Interactive Brokers", type: "TRADFI", requiresKeys: true, status: "live" },
  { id: "COINBASE", name: "Coinbase Advanced", type: "CRYPTO", requiresKeys: true, status: "live" },
  { id: "BINANCE", name: "Binance", type: "CRYPTO", requiresKeys: true, status: "live" },
  { id: "KRAKEN", name: "Kraken", type: "CRYPTO", requiresKeys: true, status: "live" },
  // No real adapter yet. Surfaced as coming soon, never selectable, so we never
  // promise a route we cannot honour.
  { id: "OANDA", name: "Oanda", type: "FOREX", requiresKeys: true, status: "coming-soon" },
  { id: "TRADOVATE", name: "Tradovate", type: "TRADFI", requiresKeys: true, status: "coming-soon" },
  { id: "SCHWAB", name: "Charles Schwab", type: "TRADFI", requiresKeys: true, status: "coming-soon" },
];

export function isBrokerLive(id: string): boolean {
  return BROKERS.some((b) => b.id === id && b.status === "live");
}
