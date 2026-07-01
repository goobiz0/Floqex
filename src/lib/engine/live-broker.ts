import ccxt from "ccxt";
import { getMarketForInstrument } from "@/lib/market";
import { createHash } from "crypto";

type BrokerCreds = Record<string, string>;
type CcxtOrder = { id: string; price: number | null; average: number | null; status?: string; filled?: number };
type CcxtPosition = { symbol?: string; contracts?: number; side?: string; entryPrice?: number };
type CcxtExchanges = Record<string, new (opts: Record<string, string | boolean | undefined>) => {
  createMarketOrder: (symbol: string, side: string, amount: number, price?: number, params?: Record<string, unknown>) => Promise<CcxtOrder>;
  fetchBalance: () => Promise<unknown>;
  fetchPositions?: (symbols?: string[]) => Promise<CcxtPosition[]>;
  has?: Record<string, boolean>;
}>;

export interface BrokerOrderResult {
  id: string;
  filledPrice: number;
  status: "FILLED" | "OPEN";
}

/** A live position as the broker currently sees it, for startup reconciliation. */
export interface BrokerPosition {
  instrument: string;
  direction: "LONG" | "SHORT";
  sizeUnits: number;
}

/**
 * Deterministic idempotency key for an order. Brokers dedupe on a client order
 * id, so a retried submission (see execution-router's submitWithRetry) can never
 * double-fill: the broker recognises the repeated key and returns the original
 * order instead of opening a second one.
 */
export function makeIdempotencyKey(parts: { botId: string; instrument: string; direction: string; kind: "OPEN" | "CLOSE"; nonce: string | number }): string {
  const raw = `flx-${parts.kind}-${parts.botId}-${parts.instrument}-${parts.direction}-${parts.nonce}`;
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return `flx-${hash}`;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────── Order routing ──────────────────────────

export async function executeLiveOrder(
  broker: string,
  creds: BrokerCreds,
  instrument: string,
  direction: string,
  sizeUnits: number,
  idempotencyKey?: string,
): Promise<BrokerOrderResult> {
  const side = direction === "LONG" ? "buy" : "sell";
  const b = broker.toLowerCase();

  if (CCXT_BROKERS.includes(b)) return executeCcxtOrder(b, creds, instrument, side, sizeUnits, idempotencyKey);
  if (b === "alpaca") return executeAlpacaOrder(creds, instrument, side, sizeUnits, idempotencyKey);
  if (b === "ibkr") return executeIbkrOrder(creds, instrument, side, sizeUnits, idempotencyKey);
  // ASX equities route through Interactive Brokers (the realistic retail path).
  if (b === "asx") return executeIbkrOrder({ ...creds, exchange: "ASX" }, instrument, side, sizeUnits, idempotencyKey);

  // OANDA, Tradovate, Schwab: no real adapter yet. Be honest, never fake a fill.
  throw new BrokerNotConfiguredError(broker, "no live adapter implemented");
}

export async function closeLivePosition(
  broker: string,
  creds: BrokerCreds,
  instrument: string,
  currentDirection: string,
  sizeUnits: number,
  idempotencyKey?: string,
): Promise<BrokerOrderResult> {
  // To close a LONG we sell; to close a SHORT we buy.
  const closingDirection = currentDirection === "LONG" ? "SHORT" : "LONG";
  return executeLiveOrder(broker, creds, instrument, closingDirection, sizeUnits, idempotencyKey);
}

// ─────────────────────────── CCXT (crypto) ──────────────────────────

async function executeCcxtOrder(broker: string, creds: BrokerCreds, instrument: string, side: string, sizeUnits: number, idempotencyKey?: string): Promise<BrokerOrderResult> {
  const exchangeClass = (ccxt as unknown as CcxtExchanges)[broker];
  if (!exchangeClass) throw new BrokerNotConfiguredError(broker, "unsupported CCXT exchange");
  if (!creds.apiKey || !creds.apiSecret) throw new BrokerNotConfiguredError(broker, "missing API key/secret");

  const exchange = new exchangeClass({ apiKey: creds.apiKey, secret: creds.apiSecret, enableRateLimit: true });
  try {
    // clientOrderId makes the submission idempotent: a retry with the same key
    // is recognised by the exchange instead of opening a second position.
    const params: Record<string, unknown> = idempotencyKey ? { clientOrderId: idempotencyKey } : {};
    const order = await exchange.createMarketOrder(instrument, side, sizeUnits, undefined, params);
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

async function alpacaFetch(creds: BrokerCreds, path: string, init?: RequestInit) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(`${alpacaBaseUrl(creds)}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "APCA-API-KEY-ID": creds.apiKey,
        "APCA-API-SECRET-KEY": creds.apiSecret,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(id);
  }
}

async function executeAlpacaOrder(creds: BrokerCreds, instrument: string, side: string, sizeUnits: number, idempotencyKey?: string): Promise<BrokerOrderResult> {
  if (!creds.apiKey || !creds.apiSecret) throw new BrokerNotConfiguredError("alpaca", "missing API key/secret");
  try {
    const body: Record<string, unknown> = { symbol: instrument, qty: sizeUnits, side, type: "market", time_in_force: "day" };
    if (idempotencyKey) body.client_order_id = idempotencyKey; // Alpaca dedupes on this
    const res = await alpacaFetch(creds, `/v2/orders`, { method: "POST", body: JSON.stringify(body) });
    const order = await res.json();
    // 422 with "client_order_id ... already exists" means the retry hit an
    // already-placed order — treat it as success and reconcile the fill below.
    if (!res.ok && !/already exists/i.test(order?.message ?? "")) {
      throw new Error(order.message || "Unknown Alpaca error");
    }
    
    let alpacaOrder = order;
    if (!res.ok && /already exists/i.test(order?.message ?? "") && idempotencyKey) {
      const getRes = await alpacaFetch(creds, `/v2/orders:by_client_order_id?client_order_id=${idempotencyKey}`);
      if (!getRes.ok) throw new Error("Failed to fetch existing Alpaca order after duplication error");
      alpacaOrder = await getRes.json();
    }
    
    let filledPrice = Number(alpacaOrder.filled_avg_price) || 0;
    let status: "FILLED" | "OPEN" = alpacaOrder.status === "filled" ? "FILLED" : "OPEN";
    // Fill confirmation: market orders usually fill within a moment; poll briefly
    // so we return a real average price rather than 0/OPEN.
    if (status !== "FILLED" && alpacaOrder.id) {
      const confirmed = await confirmAlpacaFill(creds, alpacaOrder.id);
      if (confirmed) {
        filledPrice = confirmed.filledPrice;
        status = confirmed.status;
      }
    }
    return { id: alpacaOrder.id, filledPrice, status };
  } catch (e) {
    const err = e as Error;
    throw new Error(`Execution failed on Alpaca: ${err.message}`);
  }
}

/** Poll an Alpaca order up to ~3s until it reports a fill (timeout + retry). */
async function confirmAlpacaFill(creds: BrokerCreds, orderId: string): Promise<{ filledPrice: number; status: "FILLED" | "OPEN" } | null> {
  for (let i = 0; i < 6; i++) {
    await sleep(500);
    try {
      const res = await alpacaFetch(creds, `/v2/orders/${orderId}`);
      if (!res.ok) continue;
      const o = await res.json();
      if (o.status === "filled" && o.filled_avg_price) {
        return { filledPrice: Number(o.filled_avg_price), status: "FILLED" };
      }
    } catch {
      // transient — keep polling
    }
  }
  return null;
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

async function executeIbkrOrder(creds: BrokerCreds, instrument: string, side: string, sizeUnits: number, idempotencyKey?: string): Promise<BrokerOrderResult> {
  if (!creds.accountId) throw new BrokerNotConfiguredError("ibkr", "missing accountId");

  const conid = await resolveIbkrConid(creds, instrument);
  const order: Record<string, unknown> = { conid: Number(conid), orderType: "MKT", side: side.toUpperCase(), quantity: sizeUnits, tif: "DAY" };
  if (idempotencyKey) order.cOID = idempotencyKey; // IBKR client order id (idempotent)
  let reply = await ibkrFetch(creds, `/iserver/account/${creds.accountId}/orders`, {
    method: "POST",
    body: JSON.stringify({ orders: [order] }),
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

// True when we can route a real live order to this broker. Paper accounts never
// need an adapter (they simulate). Used to warn the user up-front instead of
// only discovering it on the first signal.
export function hasLiveAdapter(broker: string): boolean {
  const b = broker.toLowerCase();
  return CCXT_BROKERS.includes(b) || b === "alpaca" || b === "ibkr" || b === "asx";
}

export function brokerSupportsInstrument(broker: string, instrument: string): boolean {
  const market = getMarketForInstrument(instrument);
  const b = broker.toLowerCase();
  if (market === "CRYPTO") return CCXT_BROKERS.includes(b);
  if (market === "ASX") return b === "ibkr" || b === "asx";
  return b === "alpaca" || b === "ibkr"; // US equities
}

// ─────────────────────── Position reconciliation ────────────────────
// On startup the engine compares what the broker actually holds against the
// OPEN trades in our DB, so a fill that landed while the engine was down (or a
// manual close on the broker side) is surfaced instead of silently drifting.

/** Fetch the broker's current open positions, best-effort. Returns [] when the
 *  broker can't report positions with the given credentials. */
export async function getBrokerPositions(broker: string, creds: BrokerCreds): Promise<BrokerPosition[] | null> {
  const b = broker.toLowerCase();
  try {
    if (CCXT_BROKERS.includes(b)) {
      const exchangeClass = (ccxt as unknown as CcxtExchanges)[b];
      if (!exchangeClass) return null;
      const exchange = new exchangeClass({ apiKey: creds.apiKey, secret: creds.apiSecret, enableRateLimit: true });
      if (!exchange.fetchPositions || !(exchange.has?.fetchPositions ?? true)) return null;
      const positions = await exchange.fetchPositions();
      return positions
        .filter((p) => p && p.symbol && Math.abs(Number(p.contracts) || 0) > 0)
        .map((p) => ({
          instrument: String(p.symbol),
          direction: (p.side === "short" ? "SHORT" : "LONG") as "LONG" | "SHORT",
          sizeUnits: Math.abs(Number(p.contracts) || 0),
        }));
    }
    if (b === "alpaca") {
      const res = await alpacaFetch(creds, `/v2/positions`);
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{ symbol: string; qty: string; side: string }>;
      return rows.map((p) => ({
        instrument: p.symbol,
        direction: (p.side === "short" ? "SHORT" : "LONG") as "LONG" | "SHORT",
        sizeUnits: Math.abs(Number(p.qty) || 0),
      }));
    }
  } catch {
    // Reconciliation is best-effort: never let a broker outage block startup.
  }
  return null;
}
