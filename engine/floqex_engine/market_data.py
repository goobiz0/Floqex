"""Market data feed. The live engine uses Yahoo Finance; the demo uses a synthetic feed."""

from __future__ import annotations

import random
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import List

from .types import Candle


class Feed(ABC):
    @abstractmethod
    def candles(self, instrument: str) -> List[Candle]:
        """All 1-minute candles for the current session, in order."""

    @abstractmethod
    def is_stale(self) -> bool:
        """True if the latest data is older than the staleness threshold."""


class SyntheticFeed(Feed):
    """
    Deterministic 1-minute candles for one session. Produces a quiet opening range
    followed by a breakout, so the ORB pipeline has something real to act on.
    """

    def __init__(
        self,
        start: datetime,
        minutes: int = 120,
        base_price: float = 2420.0,
        range_size: float = 4.0,
        breakout_after: int = 22,
        direction: int = 1,
        seed: int = 7,
    ):
        self.start = start
        self.minutes = minutes
        self.base_price = base_price
        self.range_size = range_size
        self.breakout_after = breakout_after
        self.direction = direction
        self._rng = random.Random(seed)

    def is_stale(self) -> bool:
        return False

    def candles(self, instrument: str) -> List[Candle]:
        out: List[Candle] = []
        price = self.base_price
        half = self.range_size / 2.0
        for i in range(self.minutes):
            ts = self.start + timedelta(minutes=i)
            if i < self.breakout_after:
                # oscillate inside the opening range
                target = self.base_price + self._rng.uniform(-half, half)
                price += (target - price) * 0.5
            else:
                # trend out of the range in `direction`
                price += self.direction * (half * 0.18) + self._rng.uniform(-0.2, 0.2)
            o = price
            c = price + self._rng.uniform(-0.3, 0.3)
            hi = max(o, c) + self._rng.uniform(0.0, 0.4)
            lo = min(o, c) - self._rng.uniform(0.0, 0.4)
            out.append(Candle(ts, round(o, 2), round(hi, 2), round(lo, 2), round(c, 2)))
            price = c
        return out
