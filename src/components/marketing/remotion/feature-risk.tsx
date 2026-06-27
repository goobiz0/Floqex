"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, interpolateColors } from "remotion";
import { COLORS, RADIUS } from "./shared";

export const FeatureRisk = () => {
  const frame = useCurrentFrame();

  const fillWidth = interpolate(frame, [20, 90], [20, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const fillColor = interpolateColors(frame, [90, 95], [COLORS.accent, COLORS.negative]);

  const percentage = Math.round(interpolate(frame, [20, 90], [0.6, 2.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) * 10) / 10;
  
  const displayPercent = percentage.toFixed(1);

  const shieldOpacity = interpolate(frame, [95, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [100, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const overallOpacity = interpolate(frame, [160, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 40 }}>
        Risk Engine
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ position: "relative", width: 200, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: COLORS.fgMuted }}>Current: <span style={{ fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>{displayPercent}%</span></span>
          </div>

          <div style={{ width: "100%", height: 10, backgroundColor: "rgba(22, 22, 25, 0.6)", borderRadius: RADIUS.pill, position: "relative", overflow: "hidden" }}>
            <div style={{ width: `${fillWidth}%`, height: "100%", backgroundColor: fillColor, borderRadius: RADIUS.pill }} />
            {/* Cap marker at 60% */}
            <div style={{ position: "absolute", left: "60%", top: 0, bottom: 0, width: 2, backgroundColor: COLORS.negative, transform: "translateX(-50%)" }} />
          </div>
          
          <div style={{ position: "absolute", right: 0, top: 0, fontSize: 12, color: COLORS.fgSubtle }}>
            Cap: <span style={{ fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>2.0%</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: textOpacity }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.negativeSoft, display: "flex", alignItems: "center", justifyContent: "center", opacity: shieldOpacity }}>
            <span style={{ color: COLORS.negative, fontWeight: 800, fontSize: 16 }}>!</span>
          </div>
          <span style={{ color: COLORS.negative, fontSize: 13, fontWeight: 600 }}>Bot paused</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default FeatureRisk;
