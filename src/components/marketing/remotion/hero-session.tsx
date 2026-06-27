"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, spring } from "remotion";
import { COLORS, RADIUS, MockCursor, MockCard, SkeletonBlock, StatusDot, FeedItem } from "./shared";

// 240 frames (8s)
export const HeroSession = () => {
  const frame = useCurrentFrame();

  // Act 1: Shell Entrance
  const shellSpring = spring({
    frame,
    fps: 30,
    config: { damping: 14, stiffness: 100 },
  });
  const shellScale = 0.95 + shellSpring * 0.05;
  const shellOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Act 2: Cursor
  const cursorOpacity = interpolate(frame, [20, 30, 210, 230], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(frame, [30, 70, 170, 210], [280, 235, 235, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 1, 0.5, 1) });
  const cursorY = interpolate(frame, [30, 70, 170, 210], [210, 245, 245, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 1, 0.5, 1) });
  
  // The click
  const clickStart = 75;
  const clickSpring = spring({
    frame: frame - clickStart,
    fps: 30,
    config: { damping: 12, stiffness: 200 },
  });
  const isClicking = frame >= clickStart && frame <= clickStart + 10;
  
  // Button press effect (dips down then back)
  const buttonScale = frame < clickStart ? 1 : interpolate(frame, [clickStart, clickStart + 5, clickStart + 15], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 1, 0.5, 1) });
  const buttonGlow = interpolate(frame, [clickStart, clickStart + 5, clickStart + 25], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Act 3: Status pop
  const statusSpring = spring({
    frame: frame - 85,
    fps: 30,
    config: { damping: 12, stiffness: 150 },
  });
  const statusScale = statusSpring;
  const statusOpacity = interpolate(frame, [85, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Act 4: Chart and numbers
  const chartStart = 90;
  const pathLength = interpolate(frame, [chartStart, chartStart + 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 1, 0.68, 1) });
  const chartGlow = interpolate(frame, [chartStart + 20, chartStart + 60, 240], [0, 0.6, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const SVG_PATH = "M0 80 C20 78 40 72 60 68 C80 64 100 70 120 58 C140 46 160 52 180 40 C200 28 220 34 240 22 C260 16 280 24 300 14 C320 8 340 18 360 10";
  const FILL_PATH = `${SVG_PATH} L360 100 L0 100 Z`;

  // Number counting up
  const activeCapital = interpolate(frame, [chartStart, chartStart + 90], [24500, 24794.50], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 1, 0.68, 1) });
  const formattedCapital = activeCapital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const profitPct = interpolate(frame, [chartStart, chartStart + 90], [1.2, 2.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 1, 0.68, 1) });

  // Feed items slide in with spring
  const getFeedStyle = (start: number) => {
    const itemSpring = spring({
      frame: frame - start,
      fps: 30,
      config: { damping: 14, stiffness: 120 },
    });
    const x = interpolate(itemSpring, [0, 1], [30, 0]);
    const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { opacity, transform: `translateX(${x}px)` };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif' }}>
      <div style={{ opacity: shellOpacity, transform: `scale(${shellScale})`, display: "flex", height: "100%", width: "100%", transformOrigin: "center center" }}>
        
        {/* Sidebar */}
        <div style={{ width: 48, height: "100%", borderRight: `1px solid ${COLORS.line}`, backgroundColor: "rgba(28, 28, 32, 0.8)", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.accent, marginBottom: 16, boxShadow: `0 0 12px ${COLORS.accentSoft}` }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: i === 1 ? COLORS.accentSoft : COLORS.surface }} />
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Topbar */}
          <div style={{ height: 48, borderBottom: `1px solid ${COLORS.line}`, backgroundColor: "rgba(9, 9, 11, 0.5)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
            <div style={{ width: 120, height: 20, borderRadius: RADIUS.control, backgroundColor: COLORS.surface }} />
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.accent }} />
              <div style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: COLORS.surface }} />
              <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: COLORS.surface }} />
            </div>
          </div>

          <div style={{ flex: 1, padding: 24, display: "flex", gap: 24 }}>
            {/* Equity */}
            <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 24 }}>
              <MockCard style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "rgba(28, 28, 32, 0.4)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ color: COLORS.fgSubtle, fontSize: 13, fontWeight: 500 }}>Active Capital</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: COLORS.fg, fontSize: 28, fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>${formattedCapital}</span>
                      <span style={{ color: COLORS.profit, fontSize: 13, fontWeight: 600 }}>+{profitPct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ opacity: statusOpacity, transform: `scale(${statusScale})`, display: "flex", alignItems: "center", gap: 6, backgroundColor: COLORS.accentSoft, padding: "6px 12px", borderRadius: RADIUS.pill, boxShadow: `0 0 16px ${COLORS.accentSoft}` }}>
                    <StatusDot color={COLORS.accent} style={{ width: 6, height: 6 }} />
                    <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Running</span>
                  </div>
                </div>

                <div style={{ flex: 1, position: "relative", minHeight: 120 }}>
                  {frame < chartStart ? (
                    <SkeletonBlock height="100%" style={{ backgroundColor: "rgba(32, 32, 36, 0.4)" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
                      {/* Chart Glow */}
                      <div style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 60, backgroundColor: COLORS.accent, filter: "blur(40px)", opacity: chartGlow, pointerEvents: "none" }} />
                      <svg viewBox="0 0 360 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", position: "relative", zIndex: 10 }}>
                        <defs>
                          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={FILL_PATH} fill="url(#chart-gradient)" opacity={pathLength} />
                        <path d={SVG_PATH} fill="none" stroke={COLORS.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={pathLength} strokeDasharray={1} strokeDashoffset={1 - pathLength} />
                      </svg>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, position: "relative" }}>
                  {/* Button Glow on Click */}
                  <div style={{ position: "absolute", right: 0, bottom: 0, width: 85, height: 32, borderRadius: RADIUS.control, backgroundColor: COLORS.accent, filter: "blur(12px)", opacity: buttonGlow }} />
                  <div style={{ transform: `scale(${buttonScale})`, backgroundColor: COLORS.accent, color: COLORS.onAccent, padding: "8px 16px", borderRadius: RADIUS.control, fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", position: "relative" }}>
                    Start Bot
                  </div>
                </div>
              </MockCard>
            </div>

            {/* Feed */}
            <div style={{ flex: 1.3, display: "flex", flexDirection: "column" }}>
              <MockCard style={{ flex: 1, padding: 16, backgroundColor: "rgba(28, 28, 32, 0.4)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <span style={{ color: COLORS.fgSubtle, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 16 }}>Live Feed</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {frame >= 100 && <FeedItem label="Scanning EURUSD" meta="1m bars" style={getFeedStyle(100)} />}
                  {frame >= 120 && <FeedItem label="Signal detected" meta="Breakout rule" style={getFeedStyle(120)} />}
                  {frame >= 140 && <FeedItem label="Risk check passed" meta="Within limits" iconColor={COLORS.info} style={getFeedStyle(140)} />}
                  {frame >= 160 && <FeedItem label="Order placed" meta="Long, bracketed" style={getFeedStyle(160)} />}
                </div>
              </MockCard>
            </div>
          </div>
        </div>
      </div>

      <div style={{ opacity: cursorOpacity, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}>
        <MockCursor x={cursorX} y={cursorY} clicking={isClicking} />
      </div>
    </AbsoluteFill>
  );
};

export default HeroSession;
