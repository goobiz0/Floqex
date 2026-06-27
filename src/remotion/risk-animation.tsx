"use client";

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";

export const RiskAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing
  const tradesStart = 20;
  const circuitHit = 120;
  
  // Interpolations
  const drawTrades = interpolate(frame, [tradesStart, circuitHit], [0, 100], {
    extrapolateRight: "clamp",
  });

  const warningScale = spring({
    fps,
    frame: frame - circuitHit,
    config: { damping: 12, stiffness: 200 }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "var(--color-base, #0a0a0a)", color: "var(--color-fg, #ededed)", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        
        {/* Title */}
        <div style={{ position: "absolute", top: 40, left: 40, fontSize: 24, fontWeight: "bold", opacity: 0.8 }}>
          Circuit Breaker (Daily Loss Cap)
        </div>
        <div style={{ position: "absolute", top: 70, left: 40, fontSize: 14, opacity: 0.5 }}>
          Trading halts automatically when the 3% daily limit is hit.
        </div>

        {/* PnL Meter */}
        <div style={{ width: "80%", height: 32, backgroundColor: "var(--color-surface, #171717)", borderRadius: 16, border: "1px solid var(--color-line, #2a2a2a)", position: "relative", overflow: "hidden" }}>
          {/* Middle zero line */}
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, backgroundColor: "var(--color-fg-muted, #a1a1aa)", zIndex: 10 }} />
          
          {/* Loss Bar expanding to the left from 50% */}
          <div style={{ 
            position: "absolute", 
            right: "50%", 
            top: 0, 
            bottom: 0, 
            backgroundColor: "var(--color-negative, #F2555A)",
            width: `${drawTrades}%`, // goes up to 100% of the left half
            opacity: 0.8
          }} />
        </div>

        <div style={{ width: "80%", display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: "var(--color-fg-subtle, #737373)" }}>
          <div style={{ color: "var(--color-negative, #F2555A)" }}>-3% (Cap)</div>
          <div>0%</div>
          <div style={{ color: "var(--color-profit, #34D399)" }}>+3%</div>
        </div>

        {/* Action Log */}
        <div style={{ marginTop: 40, width: "80%", border: "1px solid var(--color-line, #2a2a2a)", borderRadius: 8, padding: 16, backgroundColor: "var(--color-elevated, #111)" }}>
          <div style={{ fontSize: 12, color: "var(--color-fg-muted, #a1a1aa)", marginBottom: 8 }}>AGENT FEED</div>
          
          {frame > 30 && (
            <div style={{ color: "var(--color-negative, #F2555A)", fontSize: 14, marginBottom: 8, opacity: interpolate(frame, [30, 40], [0, 1]) }}>
              [10:14] Trade closed: NQ Short (-1.0%)
            </div>
          )}
          {frame > 60 && (
            <div style={{ color: "var(--color-negative, #F2555A)", fontSize: 14, marginBottom: 8, opacity: interpolate(frame, [60, 70], [0, 1]) }}>
              [10:42] Trade closed: ES Long (-1.0%)
            </div>
          )}
          {frame > 90 && (
            <div style={{ color: "var(--color-negative, #F2555A)", fontSize: 14, marginBottom: 8, opacity: interpolate(frame, [90, 100], [0, 1]) }}>
              [11:05] Trade closed: GC Short (-1.0%)
            </div>
          )}
          
          {frame > circuitHit && (
            <div style={{
              color: "var(--color-warning, #eab308)", 
              fontSize: 14, 
              fontWeight: "bold",
              marginTop: 16,
              transform: `scale(${warningScale})`,
              transformOrigin: "left center"
            }}>
              [11:05] ⚠️ Daily loss cap (-3%) reached. Halting all bots.
            </div>
          )}
        </div>

      </div>
    </AbsoluteFill>
  );
};
