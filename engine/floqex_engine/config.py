"""Session schedule, instrument metadata, and defaults."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from .types import RiskConfig, Session, StrategyParams


@dataclass(frozen=True)
class Instrument:
    symbol: str          # display name
    ticker: str          # data ticker (e.g. Yahoo GC=F)
    point_value: float   # $ per 1.0 price move per unit
    typical_range: float # typical 15-min opening range size, for the health filter


INSTRUMENTS = {
    "Gold": Instrument("Gold", "GC=F", 1.0, 4.5),
    "NQ": Instrument("NQ", "NQ=F", 1.0, 35.0),
    "ES": Instrument("ES", "ES=F", 1.0, 6.0),
}


@dataclass(frozen=True)
class SessionConfig:
    session: Session
    timezone: str
    open_local: str        # HH:MM in the session timezone
    close_local: str
    instruments: List[str] = field(default_factory=list)


SESSIONS = [
    SessionConfig(Session.ASIA, "Asia/Tokyo", "09:00", "13:00", ["Gold"]),
    SessionConfig(Session.NY, "America/New_York", "09:30", "16:00", ["Gold", "NQ", "ES"]),
]

DEFAULT_PARAMS = StrategyParams()
DEFAULT_RISK = RiskConfig()
STARTING_BALANCE = 10_000.0
SLIPPAGE_PCT = 0.0002  # 0.02% applied on entry and exit
