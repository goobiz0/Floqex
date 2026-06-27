"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { COLORS, MockCursor, StatusDot, FeedItem } from "./shared";

export const FeatureFeed = () => {
  const frame = useCurrentFrame();

  const getEntrance = (startFrame: number) => {
    const opacity = interpolate(frame, [startFrame, startFrame + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    const x = interpolate(frame, [startFrame, startFrame + 12], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    return { opacity, transform: `translateX(${x}px)` };
  };

  const cursorOpacity = interpolate(frame, [120, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(frame, [120, 130], [300, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.23, 1, 0.32, 1) });
  const cursorY = interpolate(frame, [120, 130], [200, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.23, 1, 0.32, 1) });

  const overallOpacity = interpolate(frame, [130, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.base, fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          Agent Feed
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusDot color={COLORS.accent} />
          <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 600 }}>Live</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {frame >= 15 && <div style={getEntrance(15)}><FeedItem label="Market scan complete" meta="15 instruments" /></div>}
        {frame >= 40 && <div style={getEntrance(40)}><FeedItem label="Breakout detected" meta="EURUSD 1m" /></div>}
        {frame >= 65 && <div style={getEntrance(65)}><FeedItem label="Risk parameters verified" meta="All within limits" iconColor={COLORS.info} /></div>}
        {frame >= 90 && <div style={getEntrance(90)}><FeedItem label="Order submitted" meta="Long 0.5 lots" /></div>}
      </div>

      <div style={{ opacity: cursorOpacity }}>
        <MockCursor x={cursorX} y={cursorY} />
      </div>
    </AbsoluteFill>
  );
};

export default FeatureFeed;
