# Floqex Bot Engine (paper)

The autonomous trading engine. This is the Phase 3 scaffold: a runnable, paper-only
vertical slice of the Opening Range Breakout strategy with hard risk controls and a
narrated decision feed. No live broker orders are placed.

## Layout

```
floqex_engine/
  types.py        Domain types (Candle, Trade, Signal, params, enums)
  config.py       Session schedule, instruments, default params
  market_data.py  Market data feed (interface + synthetic feed for the demo)
  news.py         Economic calendar + blackout windows (+ safe fallback)
  risk.py         Position sizing, daily loss cap, trade caps, instrument benching
  strategy/
    base.py       Strategy interface
    orb.py        Opening Range Breakout
  execution.py    PaperBroker (simulated fills + P&L)
  agent_feed.py   Plain-English decision narration
  session.py      SessionOrchestrator (state machine, staleness + news gating)
  runner.py       Wires everything together and runs a paper session
```

## What is real vs stubbed

- **Real:** the ORB signal logic, range-health filter, risk engine (sizing, daily loss
  cap, trade caps, benching), paper fill simulation with slippage, R-multiple tracking,
  news blackout gating, and the narration feed.
- **Stubbed for the demo:** the live market feed (`SyntheticFeed` generates candles so the
  runner is self-contained) and the broker connection. Swap `SyntheticFeed` for a Yahoo
  Finance / broker feed and `PaperBroker` for a live `BrokerAdapter` to go live.

## Run the demo

```bash
cd engine
python -m floqex_engine.runner
```

It plays a synthetic New York session through the full pipeline and prints the agent feed.

## Mapping to the app

The engine writes the same shapes the web app reads (`prisma/schema.prisma`): trades,
bot adjustments, and daily summaries. The narration here is the Agent Feed shown on the
dashboard.
