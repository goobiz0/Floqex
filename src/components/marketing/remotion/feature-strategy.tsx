"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { COLORS, RADIUS } from "./shared";

const Block = ({ children, style, accentLeft = false, isAction = false }: any) => (
  <div
    style={{
      backgroundColor: isAction ? COLORS.accentSoft : "rgba(28, 28, 32, 0.6)",
      backdropFilter: "blur(8px)",
      border: `1px solid ${COLORS.line}`,
      borderLeft: accentLeft ? `3px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
      borderRadius: RADIUS.control,
      padding: "8px 14px",
      color: isAction ? COLORS.accent : COLORS.fg,
      fontSize: 12,
      fontWeight: isAction ? 600 : 500,
      position: "absolute",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      ...style,
    }}
  >
    {children}
  </div>
);

// 120 frames
export const FeatureStrategy = () => {
  const frame = useCurrentFrame();

  const getEntrance = (startFrame: number) => {
    const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    const y = interpolate(frame, [startFrame, startFrame + 15], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    return { opacity, transform: `translateY(${y}px)` };
  };

  const block1 = getEntrance(10);
  const block2 = getEntrance(40);
  const block3 = getEntrance(70);

  const line1PathLength = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const line2PathLength = interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const pulseOpacity = interpolate(frame, [85, 95, 105], [0.3, 0.8, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const overallOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
        Strategy Builder
      </div>

      <div style={{ position: "relative", flex: 1, marginTop: 20 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
          <path d="M 100 20 L 140 20 L 140 65 L 180 65" fill="none" stroke={COLORS.lineStrong} strokeWidth={1.5} pathLength={line1PathLength} strokeDasharray={1} strokeDashoffset={1 - line1PathLength} />
          <path d="M 230 85 L 230 115 L 150 115 L 150 135" fill="none" stroke={COLORS.lineStrong} strokeWidth={1.5} pathLength={line2PathLength} strokeDasharray={1} strokeDashoffset={1 - line2PathLength} />
        </svg>

        <Block style={{ left: 20, top: 5, ...block1 }}>Price &gt; SMA 20</Block>
        <Block style={{ left: 180, top: 50, ...block2 }} accentLeft>Volume spike</Block>
        
        {frame >= 85 && <div style={{ position: "absolute", left: 100, top: 135, width: 100, height: 35, borderRadius: RADIUS.control, backgroundColor: COLORS.accent, filter: "blur(12px)", opacity: pulseOpacity }} />}
        <Block style={{ left: 100, top: 135, ...block3 }} isAction>Execute long</Block>
      </div>
    </AbsoluteFill>
  );
};

export default FeatureStrategy;
