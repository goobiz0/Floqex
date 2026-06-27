"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { DisplayValue } from "@/components/ui/display-value";
import { Segmented } from "@/components/ui/segmented";
import type { EquityPoint } from "@/lib/metrics";
import gsap from "gsap";
import { Newspaper } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const DAYS: Record<Timeframe, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: Number.POSITIVE_INFINITY,
};

const W = 800;
const H = 280;

// Mock high-impact news events
const MOCK_NEWS = [
  { date: "2026-06-12", title: "CPI" },
  { date: "2026-06-18", title: "FOMC" },
  { date: "2026-06-05", title: "NFP" },
  { date: "2026-05-15", title: "CPI" },
  { date: "2026-05-01", title: "FOMC" },
  { date: "2026-04-03", title: "NFP" },
];

function buildPaths(series: EquityPoint[]) {
  const values = series.map(p => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((val, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - 16 - ((val - min) / span) * (H - 36);
    return { x, y, val, date: series[i].date };
  });
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area, min, max, last: values[values.length - 1], pts };
}

export function EquityCurve({ series, enableNews = true }: { series: EquityPoint[]; enableNews?: boolean }) {
  const [tf, setTf] = useState<Timeframe>("3M");
  const [showNews, setShowNews] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    const n = DAYS[tf];
    const sliced =
      n === Number.POSITIVE_INFINITY ? series : series.slice(-Math.min(series.length, n));
    if (sliced.length < 2) return null;
    return buildPaths(sliced);
  }, [series, tf]);

  useEffect(() => {
    if (!data || !lineRef.current || !areaRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    gsap.killTweensOf([lineRef.current, areaRef.current]);
    
    if (reduce) {
      gsap.set(lineRef.current, { strokeDasharray: "none", strokeDashoffset: 0 });
      gsap.set(areaRef.current, { opacity: 1 });
      return;
    }
    
    const length = lineRef.current.getTotalLength() || 1000;
    gsap.fromTo(lineRef.current, 
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 1.2, ease: "power3.inOut" }
    );
    gsap.fromTo(areaRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, delay: 0.2, ease: "power2.out" }
    );
  }, [data, tf]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!data || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgX = (x / rect.width) * W;
    
    // find closest point
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < data.pts.length; i++) {
      const diff = Math.abs(data.pts[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIdx(closestIdx);
  };

  const activePoint = hoverIdx !== null && data ? data.pts[hoverIdx] : null;

  // Find news points that match dates in the current series
  const newsPoints = useMemo(() => {
    if (!data || !showNews) return [];
    const points: { x: number; title: string }[] = [];
    MOCK_NEWS.forEach(news => {
      // Find the closest point in data.pts to this news date
      const pt = data.pts.find(p => p.date === news.date || p.date.startsWith(news.date));
      if (pt) {
        points.push({ x: pt.x, title: news.title });
      }
    });
    return points;
  }, [data, showNews]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Segmented
            size="sm"
            options={TIMEFRAMES.map((t) => ({ value: t, label: t }))}
            value={tf}
            onChange={setTf}
          />
          {enableNews && (
            <button
              onClick={() => setShowNews(s => !s)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                showNews
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-fg-subtle hover:text-fg hover:border-line-strong"
              )}
            >
              <Newspaper size={14} />
              News
            </button>
          )}
        </div>
        {data ? <span className="tnum text-xs text-fg-subtle"><DisplayValue type="BALANCE" money={data.last} /></span> : null}
      </div>

      {data ? (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full cursor-crosshair touch-none"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Equity curve over ${tf}`}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-profit)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-profit)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((p) => (
              <line
                key={p}
                x1="0"
                y1={H * p}
                x2={W}
                y2={H * p}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
            ))}
            
            {/* News Overlays */}
            {newsPoints.map((np, i) => (
              <g key={`news-${i}`}>
                <line
                  x1={np.x}
                  y1={0}
                  x2={np.x}
                  y2={H}
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
                <rect
                  x={np.x - 20}
                  y={4}
                  width={40}
                  height={16}
                  rx={4}
                  fill="var(--color-base)"
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                />
                <text
                  x={np.x}
                  y={15}
                  fontSize="9"
                  fill="var(--color-accent)"
                  textAnchor="middle"
                  className="font-mono font-medium"
                >
                  {np.title}
                </text>
              </g>
            ))}

            <path
              ref={areaRef}
              d={data.area}
              fill="url(#eqFill)"
            />
            <path
              ref={lineRef}
              d={data.line}
              fill="none"
              stroke="var(--color-profit)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {activePoint && (
              <>
                <line
                  x1={activePoint.x}
                  y1={0}
                  x2={activePoint.x}
                  y2={H}
                  stroke="var(--color-line-strong)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="4"
                  fill="var(--color-base)"
                  stroke="var(--color-profit)"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>

          {activePoint && (
             <div 
               className="absolute z-10 pointer-events-none rounded-[8px] bg-elevated border border-line shadow-[var(--shadow-sm)] p-2 text-xs"
               style={{ 
                 left: `calc(${(activePoint.x / W) * 100}% - 40px)`, 
                 top: `calc(${(activePoint.y / H) * 100}% - 45px)` 
               }}
             >
               <div className="font-bold text-fg tnum"><DisplayValue type="BALANCE" money={activePoint.val} /></div>
               {activePoint.date && <div className="text-fg-faint mt-0.5">{activePoint.date}</div>}
             </div>
          )}

          <div className="pointer-events-none absolute right-0 top-0 flex h-full flex-col justify-between py-1 text-right">
            <span className="tnum text-[0.65rem] text-fg-faint"><DisplayValue type="BALANCE" money={data.max} /></span>
            <span className="tnum text-[0.65rem] text-fg-faint"><DisplayValue type="BALANCE" money={data.min} /></span>
          </div>
        </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-center text-sm text-fg-subtle">
          No equity history yet. Your curve appears once the bot logs its first session.
        </div>
      )}
    </div>
  );
}
