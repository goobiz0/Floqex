"use client";

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";

export const OrbAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing
  const drawRangeStart = 20;
  const drawRangeEnd = 80;
  const breakoutStart = 120;
  
  // Interpolations
  const rangeOpacity = interpolate(frame, [drawRangeStart, drawRangeStart + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const lineProgress = interpolate(frame, [0, drawRangeEnd], [0, 100], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });

  const breakoutProgress = interpolate(frame, [breakoutStart, breakoutStart + 60], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  });
  
  const targetOpacity = interpolate(frame, [breakoutStart + 50, breakoutStart + 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "var(--color-base, #0a0a0a)", color: "var(--color-fg, #ededed)", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, padding: 40, display: "flex", flexDirection: "column" }}>
        
        {/* Title */}
        <div style={{ fontSize: 24, fontWeight: "bold", opacity: 0.8 }}>
          Opening Range Breakout (ORB)
        </div>
        <div style={{ fontSize: 14, opacity: 0.5, marginTop: 4 }}>
          First 15 minutes defines the range. Breakout defines the trade.
        </div>

        {/* Chart Area */}
        <div style={{ flex: 1, position: "relative", marginTop: 40, borderBottom: "1px solid var(--color-line, #2a2a2a)", borderLeft: "1px solid var(--color-line, #2a2a2a)" }}>
          
          {/* OR Range Box (High to Low) */}
          <div style={{ 
            position: "absolute", 
            left: 0, 
            width: "30%", 
            top: "40%", 
            height: "20%", 
            backgroundColor: "rgba(16, 185, 129, 0.1)", // Accent soft
            borderTop: "1px dashed var(--color-accent, #10B981)",
            borderBottom: "1px dashed var(--color-negative, #F2555A)",
            opacity: rangeOpacity
          }}>
            <div style={{ position: "absolute", top: -25, right: -120, fontSize: 12, color: "var(--color-accent, #10B981)", opacity: rangeOpacity }}>
              OR High (Resistance)
            </div>
            <div style={{ position: "absolute", bottom: -25, right: -100, fontSize: 12, color: "var(--color-negative, #F2555A)", opacity: rangeOpacity }}>
              OR Low (Support)
            </div>
          </div>

          {/* Price Line (First 15 mins) */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            <path 
              d="M 0,200 Q 50,220 100,160 T 200,190 T 240,210" 
              fill="none" 
              stroke="var(--color-fg-muted, #a1a1aa)" 
              strokeWidth={3}
              strokeDasharray={1000}
              strokeDashoffset={1000 - (lineProgress / 100) * 1000}
            />
            {/* Breakout Line */}
            <path 
              d="M 240,210 Q 300,200 350,120 T 500,40" 
              fill="none" 
              stroke="var(--color-profit, #34D399)" 
              strokeWidth={3}
              strokeDasharray={1000}
              strokeDashoffset={1000 - (breakoutProgress / 100) * 1000}
            />
          </svg>

          {/* Entry Signal */}
          {frame > breakoutStart + 15 && (
            <div style={{
              position: "absolute",
              left: 310,
              top: 140,
              backgroundColor: "var(--color-profit, #34D399)",
              color: "#000",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: "bold",
              transform: `scale(${spring({ fps, frame: frame - (breakoutStart + 15), config: { damping: 12 } })})`
            }}>
              ENTRY (Long)
            </div>
          )}

          {/* Target */}
          <div style={{ 
            position: "absolute", 
            left: 0, 
            width: "100%", 
            top: 40, 
            borderTop: "1px dotted var(--color-profit, #34D399)",
            opacity: targetOpacity
          }}>
            <div style={{ position: "absolute", top: -20, right: 10, fontSize: 12, color: "var(--color-profit, #34D399)" }}>
              2R Target
            </div>
          </div>

        </div>
      </div>
    </AbsoluteFill>
  );
};
