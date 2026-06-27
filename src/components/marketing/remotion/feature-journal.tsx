"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill, spring } from "remotion";
import { COLORS, RADIUS, SkeletonBlock } from "./shared";

// 120 frames
export const FeatureJournal = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const rowSpring = spring({
    frame: frame - 25,
    fps: 30,
    config: { damping: 14, stiffness: 120 },
  });
  const rowOpacity = interpolate(frame, [25, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rowY = interpolate(rowSpring, [0, 1], [20, 0]);

  const detailSpring = spring({
    frame: frame - 45,
    fps: 30,
    config: { damping: 16, stiffness: 100 },
  });
  const detailOpacity = interpolate(frame, [45, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const detailHeight = interpolate(detailSpring, [0, 1], [0, 100]);
  const detailPadding = interpolate(detailSpring, [0, 1], [0, 16]);

  const badgeSpring = spring({
    frame: frame - 70,
    fps: 30,
    config: { damping: 10, stiffness: 180 },
  });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(frame, [70, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const overallOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
        Trade Journal
      </div>

      <div style={{ display: "flex", flexDirection: "column", backgroundColor: "rgba(28, 28, 32, 0.6)", backdropFilter: "blur(16px)", border: `1px solid ${COLORS.line}`, borderRadius: RADIUS.card, padding: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
        <div style={{ opacity: headerOpacity, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, paddingBottom: 12, borderBottom: `1px solid ${COLORS.line}`, color: COLORS.fgFaint, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
          <span>Date</span>
          <span>Instrument</span>
          <span>Direction</span>
          <span>Net P/L</span>
        </div>

        <div style={{ opacity: rowOpacity, transform: `translateY(${rowY}px)`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, paddingTop: 16, alignItems: "center" }}>
          <SkeletonBlock width={60} height={14} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
          <span style={{ color: COLORS.fg, fontSize: 13, fontWeight: 600 }}>EURUSD</span>
          <div>
            <span style={{ backgroundColor: COLORS.accentSoft, color: COLORS.accent, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: RADIUS.pill }}>LONG</span>
          </div>
          <SkeletonBlock width={50} height={14} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
        </div>

        <div style={{ overflow: "hidden", height: detailHeight, opacity: detailOpacity, display: "flex", flexDirection: "column", paddingTop: detailPadding, marginTop: detailPadding, borderTop: `1px dashed ${COLORS.lineStrong}` }}>
          <span style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Bot narrative</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonBlock width={220} height={10} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
            <SkeletonBlock width={180} height={10} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
            <SkeletonBlock width={140} height={10} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
          </div>
        </div>

        {frame >= 70 && (
          <div style={{ position: "absolute", bottom: -12, right: 20, opacity: badgeOpacity, transform: `scale(${badgeScale})`, backgroundColor: COLORS.surface, border: `1px solid ${COLORS.lineStrong}`, color: COLORS.fg, fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: RADIUS.pill, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
            <span style={{ color: COLORS.accent, marginRight: 6 }}>✓</span> Logged automatically
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default FeatureJournal;
