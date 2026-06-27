"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { COLORS, RADIUS, MockCursor, MockCard, SkeletonBlock, StatusDot, FeedItem } from "./shared";

export const HeroSession = () => {
  const frame = useCurrentFrame();

  // Act 1: Fade in shell (0-30)
  const shellOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Act 2: Cursor moves and clicks Start (60-120)
  const cursorOpacity = interpolate(frame, [50, 70, 330, 350], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(frame, [60, 110, 200, 240], [280, 235, 235, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.23, 1, 0.32, 1),
  });
  const cursorY = interpolate(frame, [60, 110, 200, 240], [210, 245, 245, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.23, 1, 0.32, 1),
  });
  
  // Click at 115
  const isClicking = frame >= 113 && frame <= 118;

  // Button brightness on click
  const buttonOpacity = interpolate(frame, [113, 115, 118], [1, 0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Status pill appears (120-140)
  const statusOpacity = interpolate(frame, [120, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const statusY = interpolate(frame, [120, 140], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Chart line draws (130-260) - slower, more deliberate
  const pathLength = interpolate(frame, [130, 260], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });

  const SVG_PATH = "M0 80 C20 78 40 72 60 68 C80 64 100 70 120 58 C140 46 160 52 180 40 C200 28 220 34 240 22 C260 16 280 24 300 14 C320 8 340 18 360 10";
  const FILL_PATH = `${SVG_PATH} L360 100 L0 100 Z`;

  // Feed items staggered (160, 190, 220, 250)
  const getFeedItemStyle = (startFrame: number) => {
    const opacity = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    const x = interpolate(frame, [startFrame, startFrame + 20], [20, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    return { opacity, translate: `${x}px 0` };
  };

  const feed1 = getFeedItemStyle(160);
  const feed2 = getFeedItemStyle(190);
  const feed3 = getFeedItemStyle(220);
  const feed4 = getFeedItemStyle(250);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif' }}>
      <div style={{ opacity: shellOpacity, display: "flex", height: "100%", width: "100%" }}>
        {/* Left thin sidebar */}
        <div style={{ width: 48, height: "100%", borderRight: `1px solid ${COLORS.line}`, backgroundColor: "rgba(28, 28, 32, 0.6)", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.accent, marginBottom: 16 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: i === 1 ? COLORS.accentSoft : COLORS.surface }} />
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Mini Topbar */}
          <div style={{ height: 48, borderBottom: `1px solid ${COLORS.line}`, backgroundColor: "rgba(9, 9, 11, 0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
            <div style={{ width: 120, height: 20, borderRadius: RADIUS.control, backgroundColor: COLORS.surface }} />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.accent }} />
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: COLORS.surface }} />
              <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: COLORS.surface }} />
            </div>
          </div>

          {/* Grid Layout */}
          <div style={{ flex: 1, padding: 20, display: "flex", gap: 20 }}>
            {/* Left Column (Equity) */}
            <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 20 }}>
              <MockCard style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "rgba(28, 28, 32, 0.4)", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ color: COLORS.fgSubtle, fontSize: 13, fontWeight: 500 }}>Active Capital</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: COLORS.fg, fontSize: 28, fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>$24,500.00</span>
                      <span style={{ color: COLORS.profit, fontSize: 13, fontWeight: 500 }}>+1.2%</span>
                    </div>
                  </div>
                  <div style={{ opacity: statusOpacity, translate: `0 ${statusY}px`, display: "flex", alignItems: "center", gap: 6, backgroundColor: COLORS.accentSoft, padding: "4px 10px", borderRadius: RADIUS.pill }}>
                    <StatusDot color={COLORS.accent} style={{ width: 6, height: 6 }} />
                    <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Running</span>
                  </div>
                </div>

                <div style={{ flex: 1, position: "relative", minHeight: 120 }}>
                  {/* Chart area */}
                  {frame < 125 ? (
                    <SkeletonBlock height="100%" style={{ backgroundColor: "rgba(32, 32, 36, 0.4)" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
                      <svg viewBox="0 0 360 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                        <defs>
                          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={FILL_PATH} fill="url(#chart-gradient)" opacity={pathLength} />
                        <path
                          d={SVG_PATH}
                          fill="none"
                          stroke={COLORS.accent}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pathLength={pathLength}
                          strokeDasharray={1}
                          strokeDashoffset={1 - pathLength}
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                  <div
                    style={{
                      backgroundColor: COLORS.accent,
                      color: COLORS.onAccent,
                      padding: "8px 16px",
                      borderRadius: RADIUS.control,
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: buttonOpacity,
                    }}
                  >
                    Start Bot
                  </div>
                </div>
              </MockCard>
            </div>

            {/* Right Column (Feed) */}
            <div style={{ flex: 1.5, display: "flex", flexDirection: "column" }}>
              <MockCard style={{ flex: 1, padding: 16, backgroundColor: "rgba(28, 28, 32, 0.4)", backdropFilter: "blur(12px)" }}>
                <span style={{ color: COLORS.fgSubtle, fontSize: 13, fontWeight: 500, display: "block", marginBottom: 16 }}>Live Feed</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {frame >= 160 && <FeedItem label="Scanning EURUSD" meta="1m bars" style={feed1} />}
                  {frame >= 190 && <FeedItem label="Signal detected" meta="Breakout rule" style={feed2} />}
                  {frame >= 220 && <FeedItem label="Risk check passed" meta="Within limits" iconColor={COLORS.info} style={feed3} />}
                  {frame >= 250 && <FeedItem label="Order placed" meta="Long, bracketed" style={feed4} />}
                </div>
              </MockCard>
            </div>
          </div>
        </div>
      </div>

      <div style={{ opacity: cursorOpacity }}>
        <MockCursor x={cursorX} y={cursorY} clicking={isClicking} />
      </div>
    </AbsoluteFill>
  );
};

export default HeroSession;
