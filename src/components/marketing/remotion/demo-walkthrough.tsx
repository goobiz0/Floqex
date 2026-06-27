"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { COLORS, RADIUS, MockSidebar, MockTopbar, MockCard, SkeletonBlock, MockCursor, FeedItem, StatusDot } from "./shared";

// Full platform demo (1200x720, 30fps, 450 frames = 15s)
export const DemoWalkthrough = () => {
  const frame = useCurrentFrame();

  // Act 1: Define Rules (0 - 150)
  // Act 2: Backtest (150 - 300)
  // Act 3: Go live (300 - 450)

  const act1Opacity = interpolate(frame, [0, 20, 130, 150], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act2Opacity = interpolate(frame, [150, 170, 280, 300], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act3Opacity = interpolate(frame, [300, 320, 430, 450], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Act 1 specific
  const block1Opacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const block2Opacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const linePathLength = interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const cursor1X = interpolate(frame, [40, 70, 90], [500, 600, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.23, 1, 0.32, 1) });
  const cursor1Y = interpolate(frame, [40, 70, 90], [400, 350, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.23, 1, 0.32, 1) });

  // Act 2 specific
  const chartDraw = interpolate(frame, [180, 240], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });

  // Act 3 specific
  const feed1Opacity = interpolate(frame, [330, 345], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feed2Opacity = interpolate(frame, [360, 375], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const livePulseOpacity = interpolate(frame, [330, 345, 360, 375, 390, 405], [0.3, 1, 0.3, 1, 0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.base, fontFamily: '"Outfit", system-ui, sans-serif' }}>
      <div style={{ display: "flex", height: "100%", width: "100%" }}>
        <MockSidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
          <MockTopbar />
          
          <div style={{ flex: 1, padding: 32, position: "relative" }}>
            
            {/* ACT 1: Define Rules */}
            <div style={{ position: "absolute", inset: 32, opacity: act1Opacity }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{ color: COLORS.fg, fontSize: 24, fontWeight: 600 }}>Strategy Lab</span>
                <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: "8px 16px", borderRadius: RADIUS.control, color: COLORS.fg, fontSize: 13, fontWeight: 500 }}>
                  Save & Backtest
                </div>
              </div>
              
              <MockCard style={{ height: "calc(100% - 60px)", position: "relative", backgroundColor: COLORS.base, backgroundImage: `radial-gradient(${COLORS.line} 1px, transparent 1px)`, backgroundSize: "28px 28px" }}>
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <path d="M 240 100 L 280 100 L 280 160 L 320 160" fill="none" stroke={COLORS.lineStrong} strokeWidth={2} pathLength={linePathLength} strokeDasharray={1} strokeDashoffset={1 - linePathLength} />
                </svg>

                <div style={{ position: "absolute", left: 80, top: 80, opacity: block1Opacity, backgroundColor: COLORS.elevated, border: `1px solid ${COLORS.line}`, padding: "12px 20px", borderRadius: RADIUS.control, color: COLORS.fg, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                  Price crosses SMA
                </div>
                
                <div style={{ position: "absolute", left: 320, top: 140, opacity: block2Opacity, backgroundColor: COLORS.accentSoft, border: `1px solid ${COLORS.accentRing}`, padding: "12px 20px", borderRadius: RADIUS.control, color: COLORS.accent, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                  Execute Long (2% Risk)
                </div>
              </MockCard>
              <MockCursor x={cursor1X} y={cursor1Y} />
            </div>

            {/* ACT 2: Backtest */}
            <div style={{ position: "absolute", inset: 32, opacity: act2Opacity, display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: COLORS.fg, fontSize: 24, fontWeight: 600 }}>Backtest Results</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: COLORS.fgMuted, fontSize: 13 }}>01 Jan - 31 Dec</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[
                  { label: "Net Profit", val: "+14.2%" },
                  { label: "Win Rate", val: "68.5%" },
                  { label: "Max Drawdown", val: "3.1%" },
                  { label: "Total Trades", val: "142" },
                ].map(stat => (
                  <MockCard key={stat.label} style={{ padding: 16 }}>
                    <span style={{ color: COLORS.fgSubtle, fontSize: 12, display: "block", marginBottom: 8 }}>{stat.label}</span>
                    <span style={{ color: COLORS.fg, fontSize: 20, fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>{stat.val}</span>
                  </MockCard>
                ))}
              </div>

              <MockCard style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
                <svg viewBox="0 0 800 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
                  <defs>
                    <linearGradient id="demo-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 160 C100 150 200 180 300 120 C400 60 500 100 600 40 C700 -20 750 20 800 10 L800 200 L0 200 Z" fill="url(#demo-chart-gradient)" opacity={chartDraw} />
                  <path
                    d="M0 160 C100 150 200 180 300 120 C400 60 500 100 600 40 C700 -20 750 20 800 10"
                    fill="none"
                    stroke={COLORS.accent}
                    strokeWidth="3"
                    strokeLinecap="round"
                    pathLength={chartDraw}
                    strokeDasharray={1}
                    strokeDashoffset={1 - chartDraw}
                  />
                </svg>
              </MockCard>
            </div>

            {/* ACT 3: Go Live */}
            <div style={{ position: "absolute", inset: 32, opacity: act3Opacity, display: "flex", gap: 24 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
                <span style={{ color: COLORS.fg, fontSize: 24, fontWeight: 600 }}>Active Bots</span>
                <MockCard style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                    <div>
                      <span style={{ color: COLORS.fg, fontSize: 18, fontWeight: 600, display: "block" }}>EURUSD Trend Follower</span>
                      <span style={{ color: COLORS.fgSubtle, fontSize: 13 }}>OANDA Live Account</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: COLORS.accentSoft, padding: "6px 12px", borderRadius: RADIUS.pill }}>
                      <StatusDot color={COLORS.accent} style={{ opacity: livePulseOpacity }} />
                      <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>Running</span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: 40 }}>
                    <div>
                      <span style={{ color: COLORS.fgSubtle, fontSize: 12, display: "block", marginBottom: 4 }}>Today's P/L</span>
                      <span style={{ color: COLORS.profit, fontSize: 24, fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>+$450.00</span>
                    </div>
                    <div>
                      <span style={{ color: COLORS.fgSubtle, fontSize: 12, display: "block", marginBottom: 4 }}>Drawdown</span>
                      <span style={{ color: COLORS.fg, fontSize: 24, fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>-0.4%</span>
                    </div>
                  </div>
                </MockCard>
              </div>

              <div style={{ width: 340, display: "flex", flexDirection: "column", gap: 24 }}>
                <span style={{ color: COLORS.fg, fontSize: 18, fontWeight: 600 }}>Agent Feed</span>
                <MockCard style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, backgroundColor: COLORS.base }}>
                  {frame >= 330 && (
                    <div style={{ opacity: feed1Opacity }}>
                      <FeedItem label="Order filled at broker" meta="Long EURUSD @ 1.0945" />
                    </div>
                  )}
                  {frame >= 360 && (
                    <div style={{ opacity: feed2Opacity }}>
                      <FeedItem label="Trailing stop updated" meta="Moved to 1.0930" iconColor={COLORS.info} />
                    </div>
                  )}
                </MockCard>
                <div style={{ backgroundColor: COLORS.negativeSoft, border: `1px solid ${COLORS.negative}`, color: COLORS.negative, textAlign: "center", padding: "12px", borderRadius: RADIUS.control, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Emergency Stop
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default DemoWalkthrough;
