"""Session orchestrator: drives one instrument through one session, candle by candle."""

from __future__ import annotations

from typing import Optional

from .agent_feed import AgentFeed
from .execution import PaperBroker
from .market_data import Feed
from .news import NewsGuard
from .risk import RiskEngine
from .strategy.base import Strategy
from .types import Session, StrategyParams, Trade


def _narrate_exit(trade: Trade) -> str:
    pnl = trade.net_pnl or 0.0
    sign = "+" if pnl >= 0 else "-"
    return (
        f"{trade.instrument} closed at {trade.exit} ({trade.exit_reason}). "
        f"{sign}${abs(pnl):,.2f} ({trade.r_multiple:+.1f}R)."
    )


class SessionOrchestrator:
    def __init__(
        self,
        feed: Feed,
        strategy: Strategy,
        risk: RiskEngine,
        broker: PaperBroker,
        news: NewsGuard,
        feed_log: AgentFeed,
        instrument: str,
        point_value: float,
        session: Session,
        params: StrategyParams,
    ):
        self.feed = feed
        self.strategy = strategy
        self.risk = risk
        self.broker = broker
        self.news = news
        self.log = feed_log
        self.instrument = instrument
        self.point_value = point_value
        self.session = session
        self.params = params

    def run(self) -> None:
        candles = self.feed.candles(self.instrument)
        if not candles:
            return
        t0 = candles[0].ts
        self.log.info(t0, f"{self.session.value} session open. Capturing opening range for {self.instrument}.")
        if self.feed.is_stale():
            self.log.warn(t0, "Market data is stale. Skipping the session.")
            return
        if self.news.degraded:
            self.log.warn(t0, "News calendar unavailable. Running in conservative mode.")

        self.strategy.reset()
        range_size, healthy = self.strategy.establish_range(candles)
        rng_end = candles[min(self.params.range_minutes, len(candles)) - 1].ts
        mult = range_size / getattr(self.strategy, "typical", range_size or 1.0)
        self.log.info(rng_end, f"{self.instrument} range = {range_size:.2f} ({mult:.1f}x normal).")
        if not healthy:
            self.log.warn(rng_end, f"Range outside the healthy band. Skipping {self.instrument}.")
            return

        open_trade: Optional[Trade] = None

        for candle in candles[self.params.range_minutes:]:
            # Manage an open trade first.
            if open_trade is not None:
                if self.news.should_flatten(candle.ts):
                    self.broker.close_at(open_trade, candle.close, candle.ts, "news")
                    self.risk.register_close(open_trade)
                    self.strategy.on_trade_closed()
                    self.log.exit(candle.ts, _narrate_exit(open_trade))
                    open_trade = None
                    continue
                if self.broker.check(open_trade, candle):
                    self.risk.register_close(open_trade)
                    self.strategy.on_trade_closed()
                    self.log.exit(candle.ts, _narrate_exit(open_trade))
                    open_trade = None
                continue

            # No open trade: look for an entry.
            signal = self.strategy.evaluate(candle)
            if signal is None:
                continue
            if self.news.in_blackout(candle.ts):
                self.log.warn(candle.ts, "Breakout during a news blackout. Sitting out.")
                continue
            ok, why = self.risk.can_open(self.instrument)
            if not ok:
                self.log.warn(candle.ts, f"Signal on {self.instrument} but cannot open: {why}.")
                if self.risk.daily_loss_limit_hit():
                    break
                continue

            entry, stop, target = self.strategy.levels(signal)
            stop_dist = abs(entry - stop)
            size, risk_amount = self.risk.position_size(stop_dist, self.point_value, entry)
            if size <= 0:
                continue
            open_trade = self.broker.open_trade(
                self.instrument, self.session, signal, entry, stop, target,
                size, risk_amount, self.point_value, candle.ts,
            )
            self.risk.register_open(open_trade)
            self.log.entry(
                candle.ts,
                f"{signal.direction.value} {self.instrument} @ {open_trade.entry} "
                f"(stop {open_trade.stop}, target {open_trade.target}, "
                f"size {size:.2f}, risk ${risk_amount:,.0f}).",
            )

        # Flatten anything still open at the session close.
        if open_trade is not None:
            last = candles[-1]
            self.broker.close_at(open_trade, last.close, last.ts, "session close")
            self.risk.register_close(open_trade)
            self.strategy.on_trade_closed()
            self.log.exit(last.ts, _narrate_exit(open_trade))

        self.log.info(candles[-1].ts, f"{self.session.value} session closed. Balance ${self.risk.balance:,.2f}.")
