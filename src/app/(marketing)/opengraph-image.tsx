import { ImageResponse } from "next/og";

export const alt = "Floqex: automated trading, with nothing hidden";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Code-rendered OG card (no external asset): dark canvas, single emerald accent.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#0A0B0D",
          backgroundImage:
            "radial-gradient(60% 60% at 85% 110%, rgba(16,185,129,0.28), transparent 70%)",
          color: "#F4F5F7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#10B981",
            }}
          />
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Floqex</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: 900,
            }}
          >
            Automated trading, with nothing hidden.
          </div>
          <div style={{ marginTop: 24, fontSize: 28, color: "#9BA1A6", maxWidth: 760 }}>
            Connect a broker, set hard risk limits, and let the bot narrate every decision.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 22, color: "#6B7177" }}>
          <span>Paper or live</span>
          <span style={{ color: "#10B981" }}>·</span>
          <span>Risk-first</span>
          <span style={{ color: "#10B981" }}>·</span>
          <span>Full decision log</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
