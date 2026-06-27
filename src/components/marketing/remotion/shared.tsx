"use client";

export const COLORS = {
  base: "#09090b",
  elevated: "#1c1c20",
  surface: "#161619",
  surfaceHover: "#202024",
  overlay: "rgba(9, 9, 11, 0.8)",
  fg: "#fafafa",
  fgMuted: "#a1a1aa",
  fgSubtle: "#71717a",
  fgFaint: "#52525b",
  accent: "#10b981",
  accentHover: "#34d399",
  accentSoft: "rgba(16, 185, 129, 0.15)",
  accentRing: "rgba(16, 185, 129, 0.3)",
  onAccent: "#022c22",
  negative: "#ef4444",
  negativeSoft: "rgba(239, 68, 68, 0.15)",
  line: "#26262b",
  lineStrong: "#3a3a42",
  info: "#3b82f6",
  profit: "#10b981",
} as const;

export const RADIUS = {
  control: 12,
  card: 24,
  lg: 32,
  pill: 9999,
} as const;

export function MockCursor({ x, y, clicking = false }: { x: number; y: number; clicking?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 50,
        translate: `${x}px ${y}px`,
        scale: clicking ? 0.85 : 1,
        transition: "scale 0.1s ease-out", // Remotion allows this small transition on an element, but it's better to animate explicitly if we want perfect frame control, though this is simple enough. Actually, I'll avoid CSS transitions entirely for Remotion.
      }}
    >
      {clicking && (
        <div
          style={{
            position: "absolute",
            left: -5,
            top: -5,
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: COLORS.accentSoft,
            border: `1px solid ${COLORS.accent}`,
          }}
        />
      )}
      <svg
        width="20"
        height="22"
        viewBox="0 0 20 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative" }}
      >
        <path
          d="M1 1L6.75 19.5L9.625 12.375L16.75 9.5L1 1Z"
          fill="white"
          stroke={COLORS.base}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function MockCard({ children, style, className }: { children?: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: COLORS.elevated,
        border: `1px solid ${COLORS.line}`,
        borderRadius: RADIUS.card,
        padding: 20,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function MockSidebar({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: 200,
        height: "100%",
        backgroundColor: COLORS.elevated,
        borderRight: `1px solid ${COLORS.line}`,
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.accent }} />
        <span style={{ color: COLORS.fg, fontWeight: 600, fontSize: 16 }}>Floqex</span>
      </div>
      
      <div style={{ width: "100%", height: 1, backgroundColor: COLORS.line, margin: "4px 0" }} />
      
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { label: "Dashboard", active: true },
          { label: "Bots", active: false },
          { label: "Markets", active: false },
          { label: "Trades", active: false },
          { label: "Strategy", active: false },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "6px 8px",
              backgroundColor: item.active ? COLORS.surface : "transparent",
              borderRadius: RADIUS.control,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: item.active ? COLORS.accentSoft : COLORS.surface,
              }}
            />
            <span
              style={{
                color: item.active ? COLORS.fg : COLORS.fgMuted,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockTopbar({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: "100%",
        height: 56,
        backgroundColor: "rgba(9, 9, 11, 0.8)",
        borderBottom: `1px solid ${COLORS.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.accent }} />
        <div style={{ width: 240, height: 32, borderRadius: RADIUS.control, backgroundColor: COLORS.surface }} />
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <StatusDot color={COLORS.accent} />
        <div style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: COLORS.surface }} />
        <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: COLORS.surface }} />
      </div>
    </div>
  );
}

export function SkeletonBlock({ width, height, borderRadius = 8, style }: { width?: number | string; height: number | string; borderRadius?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: width || "100%",
        height,
        borderRadius,
        backgroundColor: COLORS.surface,
        ...style,
      }}
    />
  );
}

export function StatusDot({ color = COLORS.accent, style }: { color?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}80`,
        ...style,
      }}
    />
  );
}

export function FeedItem({
  label,
  meta,
  opacity = 1,
  style,
  iconColor = COLORS.accent,
}: {
  label: string;
  meta: string;
  opacity?: number;
  style?: React.CSSProperties;
  iconColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        backgroundColor: "rgba(22, 22, 25, 0.6)",
        border: `1px solid ${COLORS.line}`,
        borderRadius: RADIUS.control,
        padding: "10px 14px",
        opacity,
        ...style,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: iconColor === COLORS.accent ? COLORS.accentSoft : iconColor === COLORS.info ? "rgba(59, 130, 246, 0.15)" : COLORS.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: iconColor }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ color: COLORS.fg, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </span>
        <span style={{ color: COLORS.fgSubtle, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {meta}
        </span>
      </div>
    </div>
  );
}
