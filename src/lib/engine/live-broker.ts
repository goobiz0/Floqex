import ccxt from "ccxt";
import { getMarketForInstrument } from "@/lib/market";

type BrokerCreds = Record<string, string>;
type CcxtExchanges = Record<string, new (opts: Record<string, string | boolean | undefined>) => {
  createMarketOrder: (symbol: string, side: string, amount: number) => Promise<{ id: string; price: number | null; average: number | null }>;
  fetchBalance: () => Promise<unknown>;
}>;

export interface BrokerOrderResult {
  id: string;
  filledPrice: number;
  status: "FILLED" | "OPEN";
}

// Thrown when a live account points at a broker we cannot truly route to with
// the supplied credentials. The engine catches this and records a RISK event +
// alert instead of opening a phantom trade. We never fabricate fills.
export class BrokerNotConfiguredError extends Error {
  constructor(broker: string, detail?: string) {
    super(`Live broker "${broker}" is not configured for real execution${detail ? `: ${detail}` : ""}.`);
    this.name = "BrokerNotConfiguredError";
  }
}

const CCXT_BROKERS = ["binance", "coinbase", "kraken", "bybit"];

// ─────────────────────────── Order routing ──────────────────────────

export async function executeLiveOrder(
  broker: string,
  creds: BrokerCreds,
  instrument: string,
  direction: string,
  sizeUnits: number,
): Promise<BrokerOrderResult> {
  const side = direction === "LONG" ? "buy" : "sell";
  const b = broker.toLowerCase();

  if (CCXT_BROKERS.includes(b)) return executeCcxtOrder(b, creds, instrument, side, sizeUnits);
  if (b === "alpaca") return executeAlpacaOrder(creds, instrument, side, sizeUnits);
  if (b === "ibkr") return executeIbkrOrder(creds, instrument, side, sizeUnits);
  // ASX equities route through Interactive Brokers (the realistic retail path).
  if (b === "asx") return executeIbkrOrder({ ...creds, exchange: "ASX" }, instrument, side, sizeUnits);

  // OANDA, Tradovate, Schwab: no real adapter yet. Be honest, never fake a fill.
  throw new BrokerNotConfiguredError(broker, "no live adapter implemented");
}

export async function closeLivePosition(
  broker: string,
  creds: BrokerCreds,
  instrument: string,
  currentDirection: string,
  sizeUnits: number,
): Promise<BrokerOrderResult> {
  // To close a LONG we sell; to close a SHORT we buy.
  const closingDirection = currentDirection === "LONG" ? "SHORT" : "LONG";
  return executeLiveOrder(broker, creds, instrument, closingDirection, sizeUnits);
}

// ─────────────────────────── CCXT (crypto) ──────────────────────────

async function executeCcxtOrder(broker: string, creds: BrokerCreds, instrument: string, side: string, sizeUnits: number): Promise<BrokerOrderResult> {
  const exchangeClass = (ccxt as unknown as CcxtExchanges)[broker];
  if (!exchangeClass) throw new BrokerNotConfiguredError(broker, "unsupported CCXT exchange");
  if (!creds.apiKey || !creds.apiSecret) throw new BrokerNotConfiguredError(broker, "missing API key/secret");

  const exchange = new exchangeClass({ apiKey: creds.apiKey, secret: creds.apiSecret, enableRateLimit: true });
  try {
    const order = await exchange.createMarketOrder(instrument, side, sizeUnits);
    const filled = order.price ?? order.average;
    if (filled == null) throw new Error("exchange returned no fill price");
    return { id: order.id, filledPrice: filled, status: "FILLED" };
  } catch (e) {
    const err = e as Error;
    throw new Error(`Execution failed on ${broker}: ${err.message}`);
  }
}

// ─────────────────────────── Alpaca (US stocks) ─────────────────────

function alpacaBaseUrl(creds: BrokerCreds): string {
  return creds.mode === "LIVE" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
}

async function executeAlpacaOrder(creds: BrokerCreds, instrument: string, side: string, sizeUnits: number): Promise<BrokerOrderResult> {
  if (!creds.apiKey || !creds.apiSecret) throw new BrokerNotConfiguredError("alpaca", "missing API key/secret");
  try {
    const res = await fetch(`${alpacaBaseUrl(creds)}/v2/orders`, {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID": creds.apiKey,
        "APCA-API-SECRET-KEY": creds.apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol: instrument, qty: sizeUnits, side, type: "market", time_in_force: "day" }),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.message || "Unknown Alpaca error");
    return {
      id: order.id,
      filledPrice: Number(order.filled_avg_price) || 0,
      status: order.status === "filled" ? "FILLED" : "OPEN",
    };
  } catch (e) {
    const err = e as Error;
    throw new Error(`Execution failed on Alpaca: ${err.message}`);
  }
}

// ───────────────── Interactive Brokers (US + ASX) ───────────────────
// IBKR Client Portal Web API. Requires the user's authenticated gateway
// reachable at creds.baseUrl (default https://localhost:5000/v1/api) and an
// account id. We resolve the contract id (conid) by symbol, then place a
// market order and walk IBKR's confirmation reply flow.

function ibkrBase(creds: BrokerCreds): string {
  return (creds.baseUrl || "https://localhost:5000/v1/api").replace(/\/$/, "");
}

async function ibkrFetch(creds: BrokerCreds, path: string, init?: RequestInit) {
  const res = await fetch(`${ibkrBase(creds)}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`IBKR ${path} -> ${res.status}`);
  return res.json();
}

async function resolveIbkrConid(creds: BrokerCreds, instrument: string): Promise<string> {
  if (creds.conid) return creds.conid;
  const symbol = instrument.replace(/\.AX$/i, "");
  const results = (await ibkrFetch(creds, `/iserver/secdef/search?symbol=${encodeURIComponent(symbol)}`)) as Array<{ conid?: string | number }>;
  const conid = results?.[0]?.conid;
  if (!conid) throw new BrokerNotConfiguredError("ibkr", `no contract found for ${instrument}`);
  return String(conid);
}

async function executeIbkrOrder(creds: BrokerCreds, instrument: string, side: string, sizeUnits: number): Promise<BrokerOrderResult> {
  if (!creds.accountId) throw new BrokerNotConfiguredError("ibkr", "missing accountId");

  const conid = await resolveIbkrConid(creds, instrument);
  let reply = await ibkrFetch(creds, `/iserver/account/${creds.accountId}/orders`, {
    method: "POST",
    body: JSON.stringify({
      orders: [{ conid: Number(conid), orderType: "MKT", side: side.toUpperCase(), quantity: sizeUnits, tif: "DAY" }],
    }),
  });

  // IBKR returns a chain of confirmation questions; reply "true" until cleared.
  for (let i = 0; i < 5; i++) {
    const first = Array.isArray(reply) ? reply[0] : reply;
    if (first?.id && first?.message) {
      reply = await ibkrFetch(creds, `/iserver/reply/${first.id}`, {
        method: "POST",
        body: JSON.stringify({ confirmed: true }),
      });
      continue;
    }
    break;
  }

  const placed = Array.isArray(reply) ? reply[0] : reply;
  const orderId = placed?.order_id || placed?.orderId;
  if (!orderId) throw new Error(`IBKR order rejected: ${JSON.stringify(placed).slice(0, 200)}`);

  // Fetch the live fill price for the placed order.
  let filledPrice = 0;
  try {
    const live = (await ibkrFetch(creds, `/iserver/account/orders`)) as { orders?: Array<{ orderId?: string | number; avgPrice?: string }> };
    const match = live.orders?.find((o) => String(o.orderId) === String(orderId));
    filledPrice = match?.avgPrice ? Number(match.avgPrice) : 0;
  } catch {
    // Order is placed; fill price will reconcile on the next poll.
  }

  return { id: String(orderId), filledPrice, status: filledPrice > 0 ? "FILLED" : "OPEN" };
}

// ─────────────────────── Connection verification ────────────────────
// Real reachability/auth check used by Settings "Ping" and account connect.

export interface VerifyResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

export async function verifyConnection(broker: string, creds: BrokerCreds): Promise<VerifyResult> {
  const b = broker.toLowerCase();
  const start = Date.now();
  try {
    if (b === "paper") {
      return { ok: true, message: "Floqex simulator ready", latencyMs: 0 };
    }
    if (CCXT_BROKERS.includes(b)) {
      const exchangeClass = (ccxt as unknown as CcxtExchanges)[b];
      if (!exchangeClass) throw new Error("unsupported exchange");
      const exchange = new exchangeClass({ apiKey: creds.apiKey, secret: creds.apiSecret, enableRateLimit: true });
      await exchange.fetchBalance();
      return { ok: true, message: "Authenticated", latencyMs: Date.now() - start };
    }
    if (b === "alpaca") {
      const res = await fetch(`${alpacaBaseUrl(creds)}/v2/account`, {
        headers: { "APCA-API-KEY-ID": creds.apiKey, "APCA-API-SECRET-KEY": creds.apiSecret },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return { ok: true, message: "Authenticated", latencyMs: Date.now() - start };
    }
    if (b === "ibkr" || b === "asx") {
      const status = (await ibkrFetch(creds, `/iserver/auth/status`)) as { authenticated?: boolean };
      if (!status?.authenticated) throw new Error("gateway not authenticated");
      return { ok: true, message: "Gateway authenticated", latencyMs: Date.now() - start };
    }
    return { ok: false, message: "No live adapter for this broker yet", latencyMs: Date.now() - start };
  } catch (e) {
    const err = e as Error;
    return { ok: false, message: err.message || "Connection failed", latencyMs: Date.now() - start };
  }
}

export function brokerSupportsInstrument(broker: string, instrument: string): boolean {
  const market = getMarketForInstrument(instrument);
  const b = broker.toLowerCase();
  if (market === "CRYPTO") return CCXT_BROKERS.includes(b);
  if (market === "ASX") return b === "ibkr" || b === "asx";
  return b === "alpaca" || b === "ibkr"; // US equities
}
