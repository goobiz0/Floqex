"""Domain types for the Floqex engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class Direction(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"


class Session(str, Enum):
    ASIA = "ASIA"
    NY = "NY"


class TradeStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


@dataclass(frozen=True)
class Candle:
    ts: datetime
    open: float
    high: float
    low: float
    close: float


@dataclass
class StrategyParams:
    range_minutes: int = 15
    rr_target: float = 2.0
    min_range_mult: float = 0.3
    max_range_mult: float = 3.0
    trend_period: int = 20
    reentry: bool = True


@dataclass
class RiskConfig:
    risk_pct: float = 1.0          # percent of balance risked per trade
    daily_loss_pct: float = 3.0    # hard daily loss ceiling
    max_trades_session: int = 4
    max_trades_day: int = 8
    max_open: int = 2
    bench_streak: int = 4          # consecutive losses on an instrument before benching
    leverage_cap: float = 20.0     # notional ceiling as a multiple of balance


@dataclass(frozen=True)
class Signal:
    direction: Direction
    price: float        # breakout close
    range_high: float
    range_low: float


@dataclass
class Trade:
    instrument: str
    session: Session
    direction: Direction
    entry: float
    stop: float
    target: float
    size: float
    risk_amount: float
    opened_at: datetime
    point_value: float = 1.0
    status: TradeStatus = TradeStatus.OPEN
    exit: Optional[float] = None
    closed_at: Optional[datetime] = None
    exit_reason: Optional[str] = None
    net_pnl: Optional[float] = None
    r_multiple: Optional[float] = None
    mfe: float = 0.0   # max favourable excursion, in R
    mae: float = 0.0   # max adverse excursion, in R

    @property
    def risk_per_unit(self) -> float:
        return abs(self.entry - self.stop)

    def excursion_r(self, price: float) -> float:
        """Signed R multiple at a given price."""
        delta = price - self.entry if self.direction is Direction.LONG else self.entry - price
        denom = self.risk_per_unit or 1e-9
        return delta / denom
