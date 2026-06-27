"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, spring } from "remotion";
import { COLORS, RADIUS } from "./shared";

const Block = ({ children, style, accentLeft = false, isAction = false }: any) => (
  <div
    style={{
      backgroundColor: isAction ? COLORS.accentSoft : "rgba(28, 28, 32, 0.8)",
      backdropFilter: "blur(12px)",
      border: `1px solid ${isAction ? COLORS.accentRing : COLORS.lineStrong}`,
      borderLeft: accentLeft ? `3px solid ${COLORS.accent}` : isAction ? `1px solid ${COLORS.accentRing}` : `1px solid ${COLORS.lineStrong}`,
      borderRadius: RADIUS.control,
      padding: "10px 16px",
      color: isAction ? COLORS.accent : COLORS.fg,
      fontSize: 13,
      fontWeight: isAction ? 700 : 500,
      position: "absolute",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
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
    const blockSpring = spring({
      frame: frame - startFrame,
      fps: 30,
      config: { damping: 12, stiffness: 150 },
    });
    const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const scale = interpolate(blockSpring, [0, 1], [0.8, 1]);
    const y = interpolate(blockSpring, [0, 1], [20, 0]);
    return { opacity, transform: `translateY(${y}px) scale(${scale})` };
  };

  const block1 = getEntrance(10);
  const block2 = getEntrance(35);
  const block3 = getEntrance(60);

  const line1PathLength = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const line2PathLength = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  
  // Pulse action block
  const pulseSpring = spring({
    frame: frame - 70,
    fps: 30,
    config: { damping: 10, stiffness: 100 },
  });
  const pulseScale = interpolate(pulseSpring, [0, 1], [0.95, 1.05]);
  const pulseOpacity = frame < 70 ? 0 : interpolate(frame, [70, 80, 100], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const overallOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Strategy Builder
      </div>

      <div style={{ position: "relative", flex: 1, marginTop: 20 }}>
        {/* Animated Lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
          {/* Line 1 */}
          <path d="M 120 25 L 145 25 L 145 65 L 180 65" fill="none" stroke={COLORS.lineStrong} strokeWidth={2} pathLength={line1PathLength} strokeDasharray={1} strokeDashoffset={1 - line1PathLength} />
          {frame >= 25 && frame <= 45 && (
            <path d="M 120 25 L 145 25 L 145 65 L 180 65" fill="none" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" pathLength={line1PathLength} strokeDasharray="0.05 1" strokeDashoffset={1 - line1PathLength} filter="blur(2px)" />
          )}

          {/* Line 2 */}
          <path d="M 230 85 L 230 115 L 160 115 L 160 135" fill="none" stroke={COLORS.lineStrong} strokeWidth={2} pathLength={line2PathLength} strokeDasharray={1} strokeDashoffset={1 - line2PathLength} />
          {frame >= 50 && frame <= 70 && (
             <path d="M 230 85 L 230 115 L 160 115 L 160 135" fill="none" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" pathLength={line2PathLength} strokeDasharray="0.05 1" strokeDashoffset={1 - line2PathLength} filter="blur(2px)" />
          )}
        </svg>

        <Block style={{ left: 10, top: 5, ...block1 }}>Price &gt; SMA 20</Block>
        <Block style={{ left: 180, top: 50, ...block2 }} accentLeft>Volume spike</Block>
        
        {/* Action block with ripple */}
        <div style={{ position: "absolute", left: 110, top: 135, ...block3 }}>
          <div style={{ position: "absolute", inset: -4, borderRadius: RADIUS.control, backgroundColor: COLORS.accent, opacity: pulseOpacity, transform: `scale(${pulseScale})`, zIndex: -1, pointerEvents: "none" }} />
          <Block isAction style={{ position: "relative", margin: 0, top: 0, left: 0, boxShadow: `0 8px 32px ${COLORS.accentSoft}` }}>Execute long</Block>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default FeatureStrategy;
