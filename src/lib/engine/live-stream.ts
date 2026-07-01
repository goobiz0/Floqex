// Real-time crypto price streaming over Binance's public WebSocket. Polling a
// REST quote every tick is slow and rate-limited; a trade stream pushes the
// latest print the instant it happens. This module is consumed ONLY by the
// long-running worker (it opens persistent sockets), and it degrades to a no-op
// everywhere else: `getStreamedPrice` simply returns null when no stream exists,
// so Next.js server actions importing `market-data` never open a socket.

import WebSocket from "ws";
import { getMarketForInstrument, normalizeInstrument } from "@/lib/market";

type Tick = { price: number; ts: number };

// Keyed by Binance symbol (e.g. "BTCUSDT").
const ticks = new Map<string, Tick>();
const sockets = new Map<string, WebSocket>();
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const backoff = new Map<string, number>();
let isShuttingDown = false;

// A streamed price older than this is treated as stale and ignored (the caller
// falls back to the REST quote), so a silently-dead socket can't serve a frozen
// price into the engine.
const STALE_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;

function binanceSymbol(instrument: string): string {
  const sym = normalizeInstrument(instrument);
  const base = sym.replace(/-?USDT?$/i, "").replace(/-?USD$/i, "");
  return `${base}USDT`.toUpperCase();
}

/** Open (once) a trade stream for a crypto instrument. No-op for non-crypto or
 *  if a socket already exists. Call this from the worker for each crypto symbol. */
export function ensureCryptoStream(instrument: string): void {
  if (isShuttingDown) return;
  if (getMarketForInstrument(instrument) !== "CRYPTO") return;
  const sym = binanceSymbol(instrument);
  if (sockets.has(sym) || reconnectTimers.has(sym)) return;
  connect(sym);
}

function connect(sym: string): void {
  let ws: WebSocket;
  try {
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@trade`);
  } catch (e) {
    console.warn(`[live-stream] could not open socket for ${sym}:`, e);
    scheduleReconnect(sym);
    return;
  }
  sockets.set(sym, ws);

  ws.on("open", () => {
    backoff.set(sym, 0); // reset backoff on a healthy connection
  });
  ws.on("message", (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString()) as { p?: string };
      const price = Number(msg.p);
      if (Number.isFinite(price) && price > 0) ticks.set(sym, { price, ts: Date.now() });
    } catch {
      // ignore malformed frames
    }
  });
  ws.on("close", () => {
    sockets.delete(sym);
    scheduleReconnect(sym);
  });
  ws.on("error", () => {
    try { ws.close(); } catch { /* already closing */ }
  });
}

function scheduleReconnect(sym: string): void {
  if (isShuttingDown) return;
  if (reconnectTimers.has(sym) || sockets.has(sym)) return;
  const prev = backoff.get(sym) ?? 0;
  const delay = Math.min(MAX_BACKOFF_MS, prev ? prev * 2 : 1000) + Math.random() * 500;
  backoff.set(sym, delay);
  const timer = setTimeout(() => {
    reconnectTimers.delete(sym);
    connect(sym);
  }, delay);
  reconnectTimers.set(sym, timer);
}

/** Latest streamed price for a crypto instrument, or null when there is no fresh
 *  stream (non-crypto, no worker socket, or the last print is stale). */
export function getStreamedPrice(instrument: string): number | null {
  if (getMarketForInstrument(instrument) !== "CRYPTO") return null;
  const t = ticks.get(binanceSymbol(instrument));
  return t && Date.now() - t.ts < STALE_MS ? t.price : null;
}

/** Tear every socket down (graceful worker shutdown). */
export function closeAllStreams(): void {
  isShuttingDown = true;
  for (const timer of reconnectTimers.values()) clearTimeout(timer);
  reconnectTimers.clear();
  for (const ws of sockets.values()) {
    try { ws.close(); } catch { /* noop */ }
  }
  sockets.clear();
}
