"""Risk engine: position sizing and the hard limits the bot can never widen."""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, Set, Tuple

from .types import RiskConfig, Trade


class RiskEngine:
    def __init__(self, config: RiskConfig, starting_balance: float):
        self.config = config
        self.balance = starting_balance
        self.day_start_balance = starting_balance
        self.trades_today = 0
        self.trades_session = 0
        self.open_count = 0
        self.loss_streak: Dict[str, int] = defaultdict(int)
        self.benched: Set[str] = set()

    # ── lifecycle ──
    def new_day(self) -> None:
        self.day_start_balance = self.balance
        self.trades_today = 0
        self.trades_session = 0
        self.benched.clear()
        self.loss_streak.clear()

    def new_session(self) -> None:
        self.trades_session = 0

    # ── gates ──
    def daily_loss_limit_hit(self) -> bool:
        loss = self.day_start_balance - self.balance
        return loss >= self.day_start_balance * self.config.daily_loss_pct / 100.0

    def can_open(self, instrument: str) -> Tuple[bool, str]:
        if self.daily_loss_limit_hit():
            return False, "daily loss limit reached"
        if self.trades_today >= self.config.max_trades_day:
            return False, "daily trade cap reached"
        if self.trades_session >= self.config.max_trades_session:
            return False, "session trade cap reached"
        if self.open_count >= self.config.max_open:
            return False, "max open positions"
        if instrument in self.benched:
            return False, f"{instrument} benched for the day"
        return True, ""

    # ── sizing ──
    def position_size(
        self, stop_distance: float, point_value: float, price: float
    ) -> Tuple[float, float]:
        """Returns (size, risk_amount) so a stop-out costs exactly risk_pct of balance."""
        risk_amount = self.balance * self.config.risk_pct / 100.0
        if stop_distance <= 0:
            return 0.0, risk_amount
        size = risk_amount / (stop_distance * point_value)
        max_notional = self.config.leverage_cap * self.balance
        notional = size * price * point_value
        if notional > max_notional:
            size = max_notional / (price * point_value)
        return size, risk_amount

    # ── bookkeeping ──
    def register_open(self, trade: Trade) -> None:
        self.open_count += 1
        self.trades_today += 1
        self.trades_session += 1

    def register_close(self, trade: Trade) -> None:
        self.open_count = max(0, self.open_count - 1)
        self.balance += trade.net_pnl or 0.0
        if (trade.net_pnl or 0.0) < 0:
            self.loss_streak[trade.instrument] += 1
            if self.loss_streak[trade.instrument] >= self.config.bench_streak:
                self.benched.add(trade.instrument)
        else:
            self.loss_streak[trade.instrument] = 0
