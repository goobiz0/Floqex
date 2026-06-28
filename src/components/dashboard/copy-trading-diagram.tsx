"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowsClockwise, Pause, Lightning, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DisplayValue } from "@/components/ui/display-value";
import { shortAccountId } from "@/lib/copy-trading";
import type { CopyAccountLite, CopyLinkRow } from "@/lib/queries";

const NODE_W = 224;
const NODE_H = 72;
const V_GAP = 22;
const PAD_X = 6;
const MIN_H = 240;

/** A short, readable label for the sizing rule shown on an edge chip. */
function edgeLabel(link: CopyLinkRow): string {
  switch (link.sizingMode) {
    case "MIRROR":
      return "1:1";
    case "MULTIPLIER":
      return `${link.multiplier}x`;
    case "PROPORTIONAL":
      return link.multiplier === 1 ? "Equity" : `Equity ${link.multiplier}x`;
    case "FIXED":
      return `${link.fixedUnits ?? 0}u`;
    default:
      return "";
  }
}

type NodePos = { account: CopyAccountLite; x: number; y: number };

/**
 * Bipartite master -> follower flow diagram. Masters sit in the left column,
 * followers in the right, with curved edges carrying a flowing dash on active
 * links (the live replication path). Real data only: it renders exactly the
 * links passed in. Hovering or focusing a node highlights its connections;
 * clicking an edge opens that link in the editor.
 */
export function CopyTradingDiagram({
  links,
  onEditLink,
}: {
  links: CopyLinkRow[];
  onEditLink?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(480, Math.min(960, Math.round(w))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { masters, followers, height } = useMemo(() => {
    const masterMap = new Map<string, CopyAccountLite>();
    const followerMap = new Map<string, CopyAccountLite>();
    for (const l of links) {
      if (!masterMap.has(l.master.id)) masterMap.set(l.master.id, l.master);
      if (!followerMap.has(l.follower.id)) followerMap.set(l.follower.id, l.follower);
    }
    const m = [...masterMap.values()];
    const f = [...followerMap.values()];
    const colH = (n: number) => (n > 0 ? n * NODE_H + (n - 1) * V_GAP : 0);
    const h = Math.max(MIN_H, colH(m.length), colH(f.length));
    return { masters: m, followers: f, height: h };
  }, [links]);

  const layout = useMemo(() => {
    const colH = (n: number) => (n > 0 ? n * NODE_H + (n - 1) * V_GAP : 0);
    const place = (arr: CopyAccountLite[], x: number): Map<string, NodePos> => {
      const start = (height - colH(arr.length)) / 2;
      const map = new Map<string, NodePos>();
      arr.forEach((account, i) => {
        map.set(account.id, { account, x, y: start + i * (NODE_H + V_GAP) });
      });
      return map;
    };
    const masterPos = place(masters, PAD_X);
    const followerPos = place(followers, width - NODE_W - PAD_X);
    return { masterPos, followerPos };
  }, [masters, followers, height, width]);

  const isDimmed = (accId: string) => activeAccount !== null && activeAccount !== accId;
  const edgeRelated = (l: CopyLinkRow) =>
    activeAccount === null || l.master.id === activeAccount || l.follower.id === activeAccount;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-auto"
      onMouseLeave={() => setActiveAccount(null)}
    >
      <div className="relative mx-auto" style={{ width, height }}>
        {/* Edges */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          aria-hidden
        >
          <defs>
            <marker id="copy-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M1,1 L8,4.5 L1,8" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker id="copy-arrow-muted" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M1,1 L8,4.5 L1,8" fill="none" stroke="var(--color-line-strong)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          {links.map((l) => {
            const m = layout.masterPos.get(l.master.id);
            const f = layout.followerPos.get(l.follower.id);
            if (!m || !f) return null;
            const x1 = m.x + NODE_W;
            const y1 = m.y + NODE_H / 2;
            const x2 = f.x;
            const y2 = f.y + NODE_H / 2;
            const dx = Math.max(40, (x2 - x1) * 0.45);
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            const active = l.status === "ACTIVE";
            const related = edgeRelated(l);
            return (
              <path
                key={l.id}
                d={d}
                fill="none"
                stroke={active ? "var(--color-accent)" : "var(--color-line-strong)"}
                strokeWidth={related ? 2 : 1.5}
                strokeLinecap="round"
                strokeDasharray={active ? "6 6" : "2 7"}
                markerEnd={active ? "url(#copy-arrow)" : "url(#copy-arrow-muted)"}
                className={cn(active && related && "copy-edge-flow")}
                style={{ opacity: related ? (active ? 0.95 : 0.6) : 0.18, transition: "opacity 150ms" }}
              />
            );
          })}
        </svg>

        {/* Edge chips (HTML, clickable) */}
        {links.map((l) => {
          const m = layout.masterPos.get(l.master.id);
          const f = layout.followerPos.get(l.follower.id);
          if (!m || !f) return null;
          const cx = (m.x + NODE_W + f.x) / 2;
          const cy = (m.y + f.y) / 2 + NODE_H / 2;
          const related = edgeRelated(l);
          const active = l.status === "ACTIVE";
          return (
            <button
              key={`chip-${l.id}`}
              type="button"
              onClick={() => onEditLink?.(l.id)}
              title={`Edit copy link: ${l.master.nickname} to ${l.follower.nickname}`}
              className={cn(
                "absolute z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5 text-[10px] font-medium shadow-[var(--shadow-sm)] transition-all duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active ? "border-accent/30 bg-accent-soft text-accent" : "border-line bg-surface text-fg-subtle",
              )}
              style={{ left: cx, top: cy, opacity: related ? 1 : 0.25 }}
            >
              {l.reverse && <ArrowsClockwise size={10} weight="bold" />}
              <span className="tnum">{edgeLabel(l)}</span>
              {!active && <Pause size={10} weight="fill" />}
            </button>
          );
        })}

        {/* Master nodes */}
        {masters.map((acc) => {
          const p = layout.masterPos.get(acc.id)!;
          return (
            <DiagramNode
              key={acc.id}
              account={acc}
              role="master"
              x={p.x}
              y={p.y}
              dimmed={isDimmed(acc.id)}
              activeSelf={activeAccount === acc.id}
              onActivate={() => setActiveAccount((cur) => (cur === acc.id ? null : acc.id))}
              onHover={() => setActiveAccount(acc.id)}
            />
          );
        })}

        {/* Follower nodes */}
        {followers.map((acc) => {
          const p = layout.followerPos.get(acc.id)!;
          return (
            <DiagramNode
              key={acc.id}
              account={acc}
              role="follower"
              x={p.x}
              y={p.y}
              dimmed={isDimmed(acc.id)}
              activeSelf={activeAccount === acc.id}
              onActivate={() => setActiveAccount((cur) => (cur === acc.id ? null : acc.id))}
              onHover={() => setActiveAccount(acc.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function DiagramNode({
  account,
  role,
  x,
  y,
  dimmed,
  activeSelf,
  onActivate,
  onHover,
}: {
  account: CopyAccountLite;
  role: "master" | "follower";
  x: number;
  y: number;
  dimmed: boolean;
  activeSelf: boolean;
  onActivate: () => void;
  onHover: () => void;
}) {
  const isMaster = role === "master";
  const needsBot = role === "follower" && !account.hasBot;
  return (
    <button
      type="button"
      onClick={onActivate}
      onMouseEnter={onHover}
      onFocus={onHover}
      aria-label={`${isMaster ? "Master" : "Follower"} account ${account.nickname} ${shortAccountId(account.id)}`}
      className={cn(
        "absolute z-20 flex flex-col justify-center rounded-[var(--radius-card)] border bg-elevated px-3 text-left shadow-[var(--shadow-sm)] transition-all duration-150 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isMaster ? "border-accent/40" : "border-line",
        activeSelf && "ring-2 ring-accent-ring",
      )}
      style={{ left: x, top: y, width: NODE_W, height: NODE_H, opacity: dimmed ? 0.3 : 1 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            isMaster ? "bg-accent-soft text-accent" : "bg-surface text-fg-muted",
          )}
        >
          {isMaster ? <Lightning size={9} weight="fill" /> : null}
          {isMaster ? "Master" : "Follower"}
        </span>
        <span className="tnum text-[9px] font-medium text-fg-faint">{shortAccountId(account.id)}</span>
      </div>
      <p className="mt-1 truncate text-[13px] font-semibold text-fg">{account.nickname}</p>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] text-fg-subtle">
          {account.broker} · {account.mode === "LIVE" ? "Live" : "Paper"}
        </span>
        {needsBot ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-warning">
            <Warning size={10} weight="fill" /> No bot
          </span>
        ) : (
          <span className="tnum text-[10px] font-medium text-accent/80">
            <DisplayValue type="BALANCE" money={account.balance} />
          </span>
        )}
      </div>
    </button>
  );
}
