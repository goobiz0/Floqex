"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, spring } from "remotion";
import { COLORS, RADIUS, MockSidebar, MockTopbar, MockCard, MockCursor, FeedItem, StatusDot } from "./shared";

// 360 frames (12s)
export const DemoWalkthrough = () => {
  const frame = useCurrentFrame();

  const act1Opacity = interpolate(frame, [0, 15, 105, 120], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act2Opacity = interpolate(frame, [120, 135, 225, 240], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act3Opacity = interpolate(frame, [240, 255, 345, 360], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Act 1
  const b1Spring = spring({ frame: frame - 20, fps: 30, config: { damping: 12, stiffness: 150 } });
  const block1Opacity = interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const block1Y = interpolate(b1Spring, [0, 1], [20, 0]);

  const b2Spring = spring({ frame: frame - 45, fps: 30, config: { damping: 12, stiffness: 150 } });
  const block2Opacity = interpolate(frame, [45, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const block2Y = interpolate(b2Spring, [0, 1], [20, 0]);

  const linePathLength = interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  
  const cursor1X = interpolate(frame, [25, 50, 70], [500, 600, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 1, 0.5, 1) });
  const cursor1Y = interpolate(frame, [25, 50, 70], [400, 350, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 1, 0.5, 1) });
  const c1Click = frame >= 75 && frame <= 80;

  // Act 2
  const statsSpring = spring({ frame: frame - 130, fps: 30, config: { damping: 14, stiffness: 120 } });
  const statsY = interpolate(statsSpring, [0, 1], [30, 0]);
  
  const chartDraw = interpolate(frame, [150, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 1, 0.68, 1) });
  const chartGlow = interpolate(frame, [160, 180, 240], [0, 0.5, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Act 3
  const act3PopSpring = spring({ frame: frame - 250, fps: 30, config: { damping: 12, stiffness: 100 } });
  const act3Scale = interpolate(act3PopSpring, [0, 1], [0.95, 1]);
  
  const f1Spring = spring({ frame: frame - 270, fps: 30, config: { damping: 12, stiffness: 150 } });
  const feed1Opacity = interpolate(frame, [270, 280], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feed1Y = interpolate(f1Spring, [0, 1], [20, 0]);

  const f2Spring = spring({ frame: frame - 295, fps: 30, config: { damping: 12, stiffness: 150 } });
  const feed2Opacity = interpolate(frame, [295, 305], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feed2Y = interpolate(f2Spring, [0, 1], [20, 0]);

  const livePulseOpacity = interpolate(frame, [260, 275, 290, 305, 320, 335], [0.4, 1, 0.4, 1, 0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif' }}>
      <div style={{ display: "flex", height: "100%", width: "100%", backgroundColor: COLORS.base }}>
        <MockSidebar style={{ backgroundColor: "rgba(28, 28, 32, 0.8)", borderRight: `1px solid ${COLORS.lineStrong}` }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
          <MockTopbar style={{ backgroundColor: "rgba(9, 9, 11, 0.6)", borderBottom: `1px solid ${COLORS.lineStrong}` }} />
          
          <div style={{ flex: 1, padding: 40, position: "relative", overflow: "hidden" }}>
            
            {/* ACT 1: Define Rules */}
            <div style={{ position: "absolute", inset: 40, opacity: act1Opacity }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <span style={{ color: COLORS.fg, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Strategy Lab</span>
                <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.lineStrong}`, padding: "10px 20px", borderRadius: RADIUS.control, color: COLORS.fg, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
                  Save & Backtest
                </div>
              </div>
              
              <MockCard style={{ height: "calc(100% - 70px)", position: "relative", backgroundColor: "rgba(28, 28, 32, 0.4)", backgroundImage: `radial-gradient(${COLORS.lineStrong} 1px, transparent 1px)`, backgroundSize: "32px 32px", border: `1px solid ${COLORS.lineStrong}` }}>
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <path d="M 280 120 L 340 120 L 340 180 L 400 180" fill="none" stroke={COLORS.lineStrong} strokeWidth={2} pathLength={linePathLength} strokeDasharray={1} strokeDashoffset={1 - linePathLength} />
                  {frame >= 55 && frame <= 85 && (
                    <path d="M 280 120 L 340 120 L 340 180 L 400 180" fill="none" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" pathLength={linePathLength} strokeDasharray="0.05 1" strokeDashoffset={1 - linePathLength} filter="blur(2px)" />
                  )}
                </svg>

                <div style={{ position: "absolute", left: 100, top: 100, opacity: block1Opacity, transform: `translateY(${block1Y}px)`, backgroundColor: "rgba(28, 28, 32, 0.9)", backdropFilter: "blur(16px)", border: `1px solid ${COLORS.lineStrong}`, padding: "16px 24px", borderRadius: RADIUS.control, color: COLORS.fg, fontSize: 15, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                  Price crosses SMA
                </div>
                
                <div style={{ position: "absolute", left: 400, top: 160, opacity: block2Opacity, transform: `translateY(${block2Y}px)`, backgroundColor: COLORS.accentSoft, border: `1px solid ${COLORS.accentRing}`, padding: "16px 24px", borderRadius: RADIUS.control, color: COLORS.accent, fontSize: 15, fontWeight: 700, boxShadow: `0 8px 32px ${COLORS.accentSoft}`, backdropFilter: "blur(16px)" }}>
                  Execute Long (2% Risk)
                </div>
              </MockCard>
              {frame < 110 && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <MockCursor x={cursor1X} y={cursor1Y} clicking={c1Click} />
                </div>
              )}
            </div>

            {/* ACT 2: Backtest */}
            <div style={{ position: "absolute", inset: 40, opacity: act2Opacity, display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: COLORS.fg, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Backtest Results</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: COLORS.fgMuted, fontSize: 14, fontWeight: 500 }}>01 Jan - 31 Dec</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, transform: `translateY(${statsY}px)` }}>
                {[
                  { label: "Net Profit", val: "+14.2%" },
                  { label: "Win Rate", val: "68.5%" },
                  { label: "Max Drawdown", val: "3.1%" },
                  { label: "Total Trades", val: "142" },
                ].map(stat => (
                  <MockCard key={stat.label} style={{ padding: 20, backgroundColor: "rgba(28, 28, 32, 0.7)", backdropFilter: "blur(16px)", border: `1px solid ${COLORS.lineStrong}` }}>
                    <span style={{ color: COLORS.fgSubtle, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</span>
                    <span style={{ color: COLORS.fg, fontSize: 26, fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>{stat.val}</span>
                  </MockCard>
                ))}
              </div>

              <MockCard style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end", backgroundColor: "rgba(28, 28, 32, 0.6)", backdropFilter: "blur(16px)", border: `1px solid ${COLORS.lineStrong}` }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, backgroundColor: COLORS.accent, filter: "blur(60px)", opacity: chartGlow, pointerEvents: "none" }} />
                <svg viewBox="0 0 800 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
                  <defs>
                    <linearGradient id="demo-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 160 C100 150 200 180 300 120 C400 60 500 100 600 40 C700 -20 750 20 800 10 L800 200 L0 200 Z" fill="url(#demo-chart-gradient)" opacity={chartDraw} />
                  <path d="M0 160 C100 150 200 180 300 120 C400 60 500 100 600 40 C700 -20 750 20 800 10" fill="none" stroke={COLORS.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={chartDraw} strokeDasharray={1} strokeDashoffset={1 - chartDraw} />
                </svg>
              </MockCard>
            </div>

            {/* ACT 3: Go Live */}
            <div style={{ position: "absolute", inset: 40, opacity: act3Opacity, transform: `scale(${act3Scale})`, display: "flex", gap: 32 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 32 }}>
                <span style={{ color: COLORS.fg, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Active Bots</span>
                <MockCard style={{ padding: 32, backgroundColor: "rgba(28, 28, 32, 0.7)", backdropFilter: "blur(16px)", border: `1px solid ${COLORS.lineStrong}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
                    <div>
                      <span style={{ color: COLORS.fg, fontSize: 22, fontWeight: 700, display: "block", marginBottom: 4 }}>EURUSD Trend Follower</span>
                      <span style={{ color: COLORS.fgSubtle, fontSize: 14, fontWeight: 500 }}>OANDA Live Account</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: COLORS.accentSoft, padding: "8px 16px", borderRadius: RADIUS.pill, boxShadow: `0 0 24px ${COLORS.accentSoft}` }}>
                      <StatusDot color={COLORS.accent} style={{ opacity: livePulseOpacity, width: 8, height: 8 }} />
                      <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Running</span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: 48 }}>
                    <div>
                      <span style={{ color: COLORS.fgSubtle, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Today&apos;s P/L</span>
                      <span style={{ color: COLORS.profit, fontSize: 32, fontWeight: 700, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>+$450.00</span>
                    </div>
                    <div>
                      <span style={{ color: COLORS.fgSubtle, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Drawdown</span>
                      <span style={{ color: COLORS.fg, fontSize: 32, fontWeight: 700, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>-0.4%</span>
                    </div>
                  </div>
                </MockCard>
              </div>

              <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 32 }}>
                <span style={{ color: COLORS.fg, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Agent Feed</span>
                <MockCard style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, backgroundColor: "rgba(28, 28, 32, 0.7)", backdropFilter: "blur(16px)", border: `1px solid ${COLORS.lineStrong}` }}>
                  {frame >= 270 && (
                    <div style={{ opacity: feed1Opacity, transform: `translateY(${feed1Y}px)` }}>
                      <FeedItem label="Order filled at broker" meta="Long EURUSD @ 1.0945" />
                    </div>
                  )}
                  {frame >= 295 && (
                    <div style={{ opacity: feed2Opacity, transform: `translateY(${feed2Y}px)` }}>
                      <FeedItem label="Trailing stop updated" meta="Moved to 1.0930" iconColor={COLORS.info} />
                    </div>
                  )}
                </MockCard>
                <div style={{ backgroundColor: COLORS.negativeSoft, border: `1px solid ${COLORS.negative}`, color: COLORS.negative, textAlign: "center", padding: "16px", borderRadius: RADIUS.control, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(239,68,68,0.2)" }}>
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
