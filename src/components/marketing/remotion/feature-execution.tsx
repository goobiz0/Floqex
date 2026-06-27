"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { COLORS, RADIUS } from "./shared";

// 120 frames
export const FeatureExecution = () => {
  const frame = useCurrentFrame();

  const barHeights = [65, 42, 78, 35, 55, 28, 48, 22];

  const getBarHeight = (index: number, targetHeight: number) => {
    const startFrame = 10 + index * 5;
    const height = interpolate(frame, [startFrame, startFrame + 15], [0, targetHeight], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    return height;
  };

  const cardTranslateY = interpolate(frame, [60, 75], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const cardOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const overallOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 40 }}>
        Order Execution
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
          {barHeights.map((h, i) => (
            <div key={i} style={{ width: 6, height: `${getBarHeight(i, h)}%`, backgroundColor: COLORS.accent, opacity: 0.7, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 20, transform: `translateY(${cardTranslateY}px)`, opacity: cardOpacity, backgroundColor: "rgba(28, 28, 32, 0.8)", backdropFilter: "blur(12px)", border: `1px solid ${COLORS.line}`, borderRadius: RADIUS.control, padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
          <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}>Filled</span>
          <span style={{ color: COLORS.fgSubtle, fontSize: 11 }}>4ms latency</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default FeatureExecution;
