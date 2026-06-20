"""Opening Range Breakout: the first strategy Floqex ships with."""

from __future__ import annotations

from typing import List, Optional, Tuple

from ..types import Candle, Direction, Signal, StrategyParams


class OpeningRangeBreakout:
    name = "Opening Range Breakout"

    def __init__(self, params: StrategyParams, typical_range: float):
        self.params = params
        self.typical = typical_range
        self.reset()

    def reset(self) -> None:
        self.range_high: Optional[float] = None
        self.range_low: Optional[float] = None
        self.range_ready = False
        self.range_healthy = False
        self.awaiting_reentry = False

    def establish_range(self, candles: List[Candle]) -> Tuple[float, bool]:
        window = candles[: self.params.range_minutes]
        self.range_high = max(c.high for c in window)
        self.range_low = min(c.low for c in window)
        self.range_ready = True
        size = self.range_high - self.range_low
        lo = self.params.min_range_mult * self.typical
        hi = self.params.max_range_mult * self.typical
        self.range_healthy = lo <= size <= hi
        return size, self.range_healthy

    def evaluate(self, candle: Candle) -> Optional[Signal]:
        if not (self.range_ready and self.range_healthy):
            return None
        assert self.range_high is not None and self.range_low is not None
        if self.awaiting_reentry:
            if self.range_low <= candle.close <= self.range_high:
                self.awaiting_reentry = False
            return None
        if candle.close > self.range_high:
            return Signal(Direction.LONG, candle.close, self.range_high, self.range_low)
        if candle.close < self.range_low:
            return Signal(Direction.SHORT, candle.close, self.range_high, self.range_low)
        return None

    def levels(self, signal: Signal) -> Tuple[float, float, float]:
        entry = signal.price
        if signal.direction is Direction.LONG:
            stop = signal.range_low
            risk = entry - stop
            target = entry + self.params.rr_target * risk
        else:
            stop = signal.range_high
            risk = stop - entry
            target = entry - self.params.rr_target * risk
        return entry, stop, target

    def on_trade_closed(self) -> None:
        if self.params.reentry:
            self.awaiting_reentry = True
