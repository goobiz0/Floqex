"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, spring } from "remotion";
import { COLORS, MockCursor, StatusDot, FeedItem } from "./shared";

// 150 frames
export const FeatureFeed = () => {
  const frame = useCurrentFrame();

  const getEntrance = (startFrame: number) => {
    const itemSpring = spring({
      frame: frame - startFrame,
      fps: 30,
      config: { damping: 12, stiffness: 150 },
    });
    const scale = interpolate(itemSpring, [0, 1], [0.9, 1]);
    const y = interpolate(itemSpring, [0, 1], [20, 0]);
    const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { opacity, transform: `translateY(${y}px) scale(${scale})` };
  };

  const cursorOpacity = interpolate(frame, [90, 100, 135, 150], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(frame, [90, 115], [300, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 1, 0.5, 1) });
  const cursorY = interpolate(frame, [90, 115], [200, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 1, 0.5, 1) });
  
  const isClicking = frame >= 115 && frame <= 120;
  
  // Feed item 2 hover state simulation
  const hoverScale = isClicking ? 0.98 : interpolate(frame, [110, 115], [1, 1.02], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const overallOpacity = interpolate(frame, [135, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Agent Feed
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "rgba(16, 185, 129, 0.1)", padding: "4px 8px", borderRadius: 9999 }}>
          <StatusDot color={COLORS.accent} style={{ boxShadow: `0 0 10px ${COLORS.accent}` }} />
          <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 700 }}>Live</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {frame >= 10 && <div style={getEntrance(10)}><FeedItem label="Market scan complete" meta="15 instruments" /></div>}
        {frame >= 35 && <div style={{ ...getEntrance(35), transform: `${getEntrance(35).transform} scale(${frame >= 110 && frame <= 130 ? hoverScale : 1})`, transition: "transform 0.1s ease" }}><FeedItem label="Breakout detected" meta="EURUSD 1m" /></div>}
        {frame >= 60 && <div style={getEntrance(60)}><FeedItem label="Risk parameters verified" meta="All within limits" iconColor={COLORS.info} /></div>}
        {frame >= 85 && <div style={getEntrance(85)}><FeedItem label="Order submitted" meta="Long 0.5 lots" /></div>}
      </div>

      <div style={{ opacity: cursorOpacity, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}>
        <MockCursor x={cursorX} y={cursorY} clicking={isClicking} />
      </div>
    </AbsoluteFill>
  );
};

export default FeatureFeed;
