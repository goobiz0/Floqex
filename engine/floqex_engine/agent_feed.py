"""Plain-English decision narration. This is the dashboard Agent Feed."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Literal

Level = Literal["info", "entry", "exit", "warn"]

_ICON = {"info": "·", "entry": "+", "exit": "=", "warn": "!"}


@dataclass
class FeedEntry:
    ts: datetime
    level: Level
    message: str


@dataclass
class AgentFeed:
    entries: List[FeedEntry] = field(default_factory=list)
    echo: bool = True

    def log(self, ts: datetime, level: Level, message: str) -> None:
        self.entries.append(FeedEntry(ts, level, message))
        if self.echo:
            print(f"{ts:%H:%M:%S} {_ICON[level]} {message}")

    def info(self, ts: datetime, message: str) -> None:
        self.log(ts, "info", message)

    def entry(self, ts: datetime, message: str) -> None:
        self.log(ts, "entry", message)

    def exit(self, ts: datetime, message: str) -> None:
        self.log(ts, "exit", message)

    def warn(self, ts: datetime, message: str) -> None:
        self.log(ts, "warn", message)
