"use client";

import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { COLORS, RADIUS, SkeletonBlock } from "./shared";

// 120 frames
export const FeatureJournal = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const rowOpacity = interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rowY = interpolate(frame, [30, 45], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });

  const detailOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const detailHeight = interpolate(frame, [50, 70], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.23, 1, 0.32, 1) });

  const badgeOpacity = interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeScale = interpolate(frame, [80, 95], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });

  const overallOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
        Trade Journal
      </div>

      <div style={{ display: "flex", flexDirection: "column", backgroundColor: "rgba(28, 28, 32, 0.4)", backdropFilter: "blur(12px)", border: `1px solid ${COLORS.line}`, borderRadius: RADIUS.card, padding: 16 }}>
        <div style={{ opacity: headerOpacity, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, paddingBottom: 12, borderBottom: `1px solid ${COLORS.line}`, color: COLORS.fgFaint, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
          <span>Date</span>
          <span>Instrument</span>
          <span>Direction</span>
          <span>Net P/L</span>
        </div>

        <div style={{ opacity: rowOpacity, transform: `translateY(${rowY}px)`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, paddingTop: 16, alignItems: "center" }}>
          <SkeletonBlock width={60} height={14} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
          <span style={{ color: COLORS.fg, fontSize: 13, fontWeight: 500 }}>EURUSD</span>
          <div>
            <span style={{ backgroundColor: COLORS.accentSoft, color: COLORS.accent, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: RADIUS.pill }}>LONG</span>
          </div>
          <SkeletonBlock width={50} height={14} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
        </div>

        <div style={{ overflow: "hidden", height: detailHeight, opacity: detailOpacity, display: "flex", flexDirection: "column", paddingTop: 16, marginTop: 16, borderTop: `1px dashed ${COLORS.line}` }}>
          <span style={{ color: COLORS.fgFaint, fontSize: 11, fontWeight: 500, marginBottom: 8 }}>Bot narrative</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SkeletonBlock width={200} height={10} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
            <SkeletonBlock width={160} height={10} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
            <SkeletonBlock width={120} height={10} style={{ backgroundColor: "rgba(82, 82, 91, 0.3)" }} />
          </div>
        </div>

        {frame >= 80 && (
          <div style={{ position: "absolute", bottom: -10, right: 20, opacity: badgeOpacity, transform: `scale(${badgeScale})`, backgroundColor: COLORS.surface, border: `1px solid ${COLORS.line}`, color: COLORS.fgSubtle, fontSize: 10, fontWeight: 500, padding: "6px 12px", borderRadius: RADIUS.pill, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
            Logged automatically
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default FeatureJournal;
