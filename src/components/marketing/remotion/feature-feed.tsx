"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { COLORS, MockCursor, StatusDot, FeedItem } from "./shared";

// 150 frames
export const FeatureFeed = () => {
  const frame = useCurrentFrame();

  const getEntrance = (startFrame: number) => {
    const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    const x = interpolate(frame, [startFrame, startFrame + 15], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    return { opacity, transform: `translateX(${x}px)` };
  };

  const cursorOpacity = interpolate(frame, [90, 100, 135, 150], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(frame, [90, 115], [300, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.23, 1, 0.32, 1) });
  const cursorY = interpolate(frame, [90, 115], [200, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.23, 1, 0.32, 1) });

  const overallOpacity = interpolate(frame, [135, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          Agent Feed
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusDot color={COLORS.accent} />
          <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 600 }}>Live</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {frame >= 10 && <div style={getEntrance(10)}><FeedItem label="Market scan complete" meta="15 instruments" /></div>}
        {frame >= 35 && <div style={getEntrance(35)}><FeedItem label="Breakout detected" meta="EURUSD 1m" /></div>}
        {frame >= 60 && <div style={getEntrance(60)}><FeedItem label="Risk parameters verified" meta="All within limits" iconColor={COLORS.info} /></div>}
        {frame >= 85 && <div style={getEntrance(85)}><FeedItem label="Order submitted" meta="Long 0.5 lots" /></div>}
      </div>

      <div style={{ opacity: cursorOpacity }}>
        <MockCursor x={cursorX} y={cursorY} />
      </div>
    </AbsoluteFill>
  );
};

export default FeatureFeed;
