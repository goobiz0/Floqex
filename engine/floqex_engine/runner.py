"""Demo runner: plays a synthetic NY session through the full pipeline.

    python -m floqex_engine.runner
"""

from __future__ import annotations

from datetime import datetime

from .agent_feed import AgentFeed
from .config import (
    DEFAULT_PARAMS,
    DEFAULT_RISK,
    INSTRUMENTS,
    SLIPPAGE_PCT,
    STARTING_BALANCE,
)
from .execution import PaperBroker
from .market_data import SyntheticFeed
from .news import NewsGuard
from .risk import RiskEngine
from .session import SessionOrchestrator
from .strategy import OpeningRangeBreakout
from .types import Session


def main() -> None:
    start = datetime(2026, 6, 19, 13, 30)  # ~NY open
    instrument = "Gold"
    meta = INSTRUMENTS[instrument]

    feed = SyntheticFeed(
        start=start, minutes=120, base_price=2420.0,
        range_size=4.0, breakout_after=15, direction=1,
    )
    strategy = OpeningRangeBreakout(DEFAULT_PARAMS, meta.typical_range)
    risk = RiskEngine(DEFAULT_RISK, STARTING_BALANCE)
    risk.new_day()
    risk.new_session()
    broker = PaperBroker(SLIPPAGE_PCT)
    news = NewsGuard(events=[])  # no events in this demo window
    feed_log = AgentFeed()

    orch = SessionOrchestrator(
        feed, strategy, risk, broker, news, feed_log,
        instrument, meta.point_value, Session.NY, DEFAULT_PARAMS,
    )

    print("Floqex paper engine - synthetic NY session")
    print("-" * 52)
    orch.run()
    print("-" * 52)
    print(f"End balance: ${risk.balance:,.2f}   trades today: {risk.trades_today}")


if __name__ == "__main__":
    main()
