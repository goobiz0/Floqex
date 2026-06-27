"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, spring } from "remotion";
import { COLORS, RADIUS } from "./shared";

// 120 frames
export const FeatureExecution = () => {
  const frame = useCurrentFrame();

  const barHeights = [65, 42, 78, 35, 55, 28, 48, 22];

  const getBarHeight = (index: number, targetHeight: number) => {
    const startFrame = 10 + index * 3;
    const barSpring = spring({
      frame: frame - startFrame,
      fps: 30,
      config: { damping: 12, stiffness: 150 },
    });
    return interpolate(barSpring, [0, 1], [0, targetHeight]);
  };

  const cardSpring = spring({
    frame: frame - 60,
    fps: 30,
    config: { damping: 12, stiffness: 180 },
  });
  const cardScale = interpolate(cardSpring, [0, 1], [0.8, 1]);
  const cardTranslateY = interpolate(cardSpring, [0, 1], [30, 0]);
  const cardOpacity = interpolate(frame, [60, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const glowOpacity = interpolate(frame, [60, 65, 85], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const overallOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 40 }}>
        Order Execution
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
          {barHeights.map((h, i) => (
            <div key={i} style={{ position: "relative", width: 6, height: `${getBarHeight(i, h)}%`, backgroundColor: COLORS.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3, boxShadow: `0 0 12px ${COLORS.accentSoft}` }}>
              {/* Hot tip */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: COLORS.onAccent, borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: 0.8 }} />
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 20, transform: `translateY(${cardTranslateY}px) scale(${cardScale})`, opacity: cardOpacity, backgroundColor: "rgba(28, 28, 32, 0.9)", backdropFilter: "blur(16px)", border: `1px solid ${COLORS.lineStrong}`, borderRadius: RADIUS.control, padding: "10px 16px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
          {/* Card glow burst */}
          <div style={{ position: "absolute", inset: -10, backgroundColor: COLORS.accent, filter: "blur(20px)", opacity: glowOpacity, pointerEvents: "none", zIndex: -1 }} />
          <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Filled</span>
          <span style={{ color: COLORS.fgSubtle, fontSize: 11, fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>4ms latency</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default FeatureExecution;
