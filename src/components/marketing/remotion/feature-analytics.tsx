"use client";

import { useCurrentFrame, interpolate, AbsoluteFill, spring } from "remotion";
import { COLORS, RADIUS } from "./shared";

// 180 frames. A clean analytics board: an equity curve draws on, the R-multiple
// spread fills in, and the headline stats count up. Mirrors the real dashboard
// analytics so the marketing motion matches the product.
const EQUITY = [40, 44, 41, 52, 58, 54, 66, 72, 70, 84, 92, 100];
const R_BARS = [3, 6, 9, 5]; // relative heights for the four R buckets
const MONO = '"Geist Mono", monospace';

function buildPath(values: number[], w: number, h: number, pad: number): { line: string; len: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return { line, len };
}

export const FeatureAnalytics = () => {
  const frame = useCurrentFrame();
  const W = 360;
  const H = 150;
  const { line, len } = buildPath(EQUITY, W, H, 12);

  // Draw the equity line on between frames 10 and 70.
  const drawProgress = interpolate(frame, [10, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dashOffset = len * (1 - drawProgress);

  const headerOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const returnVal = Math.round(interpolate(frame, [40, 90], [0, 42], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const winVal = Math.round(interpolate(frame, [40, 90], [0, 61], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const ddVal = (interpolate(frame, [40, 90], [0, 8.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })).toFixed(1);

  const overallOpacity = interpolate(frame, [165, 180], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", fontFamily: '"Outfit", system-ui, sans-serif', padding: 24, opacity: overallOpacity }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, opacity: headerOpacity }}>
        <span style={{ color: COLORS.fgSubtle, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Analytics
        </span>
        <span style={{ color: COLORS.fgFaint, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, border: `1px solid ${COLORS.line}`, borderRadius: RADIUS.pill, padding: "1px 6px" }}>
          Illustrative
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1 }}>
        {/* Equity curve */}
        <div style={{ flex: 1.4, backgroundColor: COLORS.elevated, border: `1px solid ${COLORS.line}`, borderRadius: RADIUS.card, padding: 14, display: "flex", flexDirection: "column" }}>
          <span style={{ color: COLORS.fgMuted, fontSize: 11, marginBottom: 6 }}>Equity curve</span>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", flex: 1 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="anFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.25" />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            {drawProgress > 0.98 && <path d={`${line} L${W - 12},${H} L12,${H} Z`} fill="url(#anFill)" />}
            <path
              d={line}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={len}
              strokeDashoffset={dashOffset}
            />
          </svg>
        </div>

        {/* R-multiple spread */}
        <div style={{ flex: 1, backgroundColor: COLORS.elevated, border: `1px solid ${COLORS.line}`, borderRadius: RADIUS.card, padding: 14, display: "flex", flexDirection: "column" }}>
          <span style={{ color: COLORS.fgMuted, fontSize: 11, marginBottom: 10 }}>R-multiple spread</span>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, flex: 1 }}>
            {R_BARS.map((barH, i) => {
              const g = spring({ frame: frame - (30 + i * 8), fps: 30, config: { damping: 13, stiffness: 90 } });
              const h = interpolate(g, [0, 1], [0, barH * 9]);
              const isLoss = i === 0;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: h,
                    backgroundColor: isLoss ? COLORS.negative : COLORS.accent,
                    opacity: isLoss ? 0.8 : 0.85,
                    borderRadius: 4,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {[
          { k: "Return", v: `+${returnVal}%`, c: COLORS.accent },
          { k: "Win rate", v: `${winVal}%`, c: COLORS.fg },
          { k: "Max DD", v: `-${ddVal}%`, c: COLORS.negative },
        ].map((s) => (
          <div key={s.k} style={{ flex: 1, backgroundColor: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: RADIUS.control, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ color: COLORS.fgSubtle, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>{s.k}</div>
            <div style={{ color: s.c, fontSize: 16, fontWeight: 700, fontFamily: MONO, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default FeatureAnalytics;
