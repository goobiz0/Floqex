"""Paper execution: simulated fills, slippage, and P&L. Swap for a BrokerAdapter to go live."""

from __future__ import annotations

from datetime import datetime

from .types import Candle, Direction, Session, Signal, Trade, TradeStatus


class PaperBroker:
    def __init__(self, slippage_pct: float = 0.0002):
        self.slippage = slippage_pct

    def open_trade(
        self,
        instrument: str,
        session: Session,
        signal: Signal,
        entry: float,
        stop: float,
        target: float,
        size: float,
        risk_amount: float,
        point_value: float,
        ts: datetime,
    ) -> Trade:
        # Slippage makes the entry slightly worse than signalled.
        if signal.direction is Direction.LONG:
            fill = entry * (1 + self.slippage)
        else:
            fill = entry * (1 - self.slippage)
        return Trade(
            instrument=instrument,
            session=session,
            direction=signal.direction,
            entry=round(fill, 2),
            stop=round(stop, 2),
            target=round(target, 2),
            size=size,
            risk_amount=risk_amount,
            opened_at=ts,
            point_value=point_value,
        )

    def check(self, trade: Trade, candle: Candle) -> bool:
        """Update excursions and close on stop/target. Returns True if the trade closed."""
        long = trade.direction is Direction.LONG
        fav_price = candle.high if long else candle.low
        adv_price = candle.low if long else candle.high
        trade.mfe = max(trade.mfe, trade.excursion_r(fav_price))
        trade.mae = min(trade.mae, trade.excursion_r(adv_price))

        hit_stop = candle.low <= trade.stop if long else candle.high >= trade.stop
        hit_target = candle.high >= trade.target if long else candle.low <= trade.target

        # Worst case: if both touch in the same candle, the stop wins.
        if hit_stop:
            self.close_at(trade, trade.stop, candle.ts, "stop")
            return True
        if hit_target:
            self.close_at(trade, trade.target, candle.ts, "target")
            return True
        return False

    def close_at(self, trade: Trade, price: float, ts: datetime, reason: str) -> None:
        long = trade.direction is Direction.LONG
        # Exit slippage makes the fill slightly worse.
        fill = price * (1 - self.slippage) if long else price * (1 + self.slippage)
        direction = 1 if long else -1
        pnl = (fill - trade.entry) * direction * trade.size * trade.point_value
        trade.exit = round(fill, 2)
        trade.closed_at = ts
        trade.exit_reason = reason
        trade.net_pnl = round(pnl, 2)

