"""Economic calendar gating. Live: ForexFactory. Falls back to a conservative schedule."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List

TOP_TIER = {"FOMC", "Non-Farm Payrolls", "CPI", "Federal Funds Rate"}

BLACKOUT_BEFORE = timedelta(minutes=15)
BLACKOUT_AFTER = timedelta(minutes=15)
FLATTEN_BEFORE = timedelta(minutes=5)


@dataclass(frozen=True)
class NewsEvent:
    ts: datetime
    currency: str
    impact: str   # LOW | MEDIUM | HIGH
    name: str

    @property
    def top_tier(self) -> bool:
        return self.name in TOP_TIER


class NewsGuard:
    """
    Computes blackout windows from stored UTC event times. If the calendar could not
    be fetched and the cache is empty, `degraded` is True and the caller should sit out
    more, not less.
    """

    def __init__(self, events: List[NewsEvent], degraded: bool = False):
        self.events = [e for e in events if e.impact == "HIGH" and e.currency == "USD"]
        self.degraded = degraded

    @classmethod
    def fallback(cls) -> "NewsGuard":
        """No calendar available: conservative mode with no known events."""
        return cls(events=[], degraded=True)

    def in_blackout(self, now: datetime) -> bool:
        for e in self.events:
            if e.ts - BLACKOUT_BEFORE <= now <= e.ts + BLACKOUT_AFTER:
                return True
        return False

    def should_flatten(self, now: datetime) -> bool:
        for e in self.events:
            if e.top_tier and e.ts - FLATTEN_BEFORE <= now < e.ts:
                return True
        return False
