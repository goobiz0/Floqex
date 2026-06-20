"""Strategy interface. A strategy is entry rules, exit levels, and filters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from ..types import Candle, Signal


class Strategy(ABC):
    name: str = "strategy"

    @abstractmethod
    def reset(self) -> None:
        """Called at the start of each session."""

    @abstractmethod
    def establish_range(self, candles: List[Candle]) -> Tuple[float, bool]:
        """Build the opening range from the first candles. Returns (range_size, healthy)."""

    @abstractmethod
    def evaluate(self, candle: Candle) -> Optional[Signal]:
        """Return a Signal if this candle triggers an entry, else None."""

    @abstractmethod
    def levels(self, signal: Signal) -> Tuple[float, float, float]:
        """Return (entry, stop, target) for a signal."""

    @abstractmethod
    def on_trade_closed(self) -> None:
        """Hook so the strategy can arm re-entry, etc."""
