"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, spring, interpolateColors } from "remotion";
import { COLORS, RADIUS } from "./shared";

// 120 frames
export const FeatureRisk = () => {
  const frame = useCurrentFrame();

  // Progress filling
  const fillSpring = spring({
    frame: frame - 15,
    fps: 30,
    config: { damping: 14, stiffness: 80 },
  });
  const fillWidth = interpolate(fillSpring, [0, 1], [20, 60]);
  
  // Color changing from green to red as it hits the cap
  const fillColor = interpolateColors(frame, [45, 50], [COLORS.accent, COLORS.negative]);
  const percentage = Math.round(interpolate(fillSpring, [0, 1], [0.6, 2.0]) * 10) / 10;
  
  // The impact shake when hitting the cap (frame 50)
  const impactSpring = spring({
    frame: frame - 50,
    fps: 30,
    config: { damping: 8, stiffness: 300 }, // High stiffness for violent shake
  });
  const shakeX = frame >= 50 && frame < 70 ? Math.sin((frame - 50) * 1.5) * (1 - impactSpring) * 10 : 0;
  const redFlash = interpolate(frame, [50, 55, 75], [0, 0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Shield pop
  const shieldSpring = spring({
    frame: frame - 55,
    fps: 30,
    config: { damping: 10, stiffness: 200 },
  });
  const shieldScale = interpolate(shieldSpring, [0, 1], [0.5, 1]);
  const shieldOpacity = interpolate(frame, [55, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [60, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const overallOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      {/* Background red flash on impact */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: COLORS.negative, opacity: redFlash, pointerEvents: "none" }} />

      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 40, position: "relative" }}>
        Risk Engine
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, transform: `translateX(${shakeX}px)` }}>
        <div style={{ position: "relative", width: 220, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: COLORS.fgMuted }}>Current Drawdown</span>
            <span style={{ color: frame >= 50 ? COLORS.negative : COLORS.fg, fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>{percentage.toFixed(1)}%</span>
          </div>

          <div style={{ width: "100%", height: 12, backgroundColor: "rgba(22, 22, 25, 0.8)", borderRadius: RADIUS.pill, position: "relative", overflow: "hidden", border: `1px solid ${COLORS.line}` }}>
            <div style={{ width: `${fillWidth}%`, height: "100%", backgroundColor: fillColor, borderRadius: RADIUS.pill, boxShadow: frame >= 50 ? `0 0 16px ${COLORS.negative}` : "none" }} />
            <div style={{ position: "absolute", left: "60%", top: 0, bottom: 0, width: 2, backgroundColor: COLORS.negative, transform: "translateX(-50%)" }} />
          </div>
          
          <div style={{ position: "absolute", right: 0, top: -2, fontSize: 11, color: COLORS.fgSubtle, transform: "translateY(-100%)" }}>
            Cap: <span style={{ fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>2.0%</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ transform: `scale(${shieldScale})`, opacity: shieldOpacity, width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.negativeSoft, border: `1px solid rgba(239, 68, 68, 0.3)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px rgba(239, 68, 68, 0.3)` }}>
            <span style={{ color: COLORS.negative, fontWeight: 800, fontSize: 18 }}>!</span>
          </div>
          <span style={{ opacity: textOpacity, color: COLORS.negative, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>Bot Auto-Paused</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default FeatureRisk;
