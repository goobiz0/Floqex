"use client";

import { useEffect, useRef } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";

const CONFIG = {
  particleCount: 70,
  trailSpan: 0.4,
  durationMs: 3200,
  pulseDurationMs: 5000,
  strokeWidth: 4.8,
  lemniscateA: 20,
  lemniscateBoost: 7,
} as const;

function normalizeProgress(p: number) {
  return ((p % 1) + 1) % 1;
}

function getDetailScale(time: number) {
  const angle = ((time % CONFIG.pulseDurationMs) / CONFIG.pulseDurationMs) * Math.PI * 2;
  return 0.52 + ((Math.sin(angle + 0.55) + 1) / 2) * 0.48;
}

function lemniscatePoint(progress: number, detailScale: number) {
  const t = progress * Math.PI * 2;
  const scale = CONFIG.lemniscateA + detailScale * CONFIG.lemniscateBoost;
  const denom = 1 + Math.sin(t) ** 2;
  return {
    x: 50 + (scale * Math.cos(t)) / denom,
    y: 50 + (scale * Math.sin(t) * Math.cos(t)) / denom,
  };
}

function buildPath(detailScale: number, steps = 480) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const pt = lemniscatePoint(i / steps, detailScale);
    return `${i === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }).join(" ");
}

export function LemniscateLoader({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const group = document.createElementNS(SVG_NS, "g");

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("fill", "none");
    path.setAttribute("opacity", "0.12");
    path.setAttribute("stroke-width", String(CONFIG.strokeWidth));
    group.appendChild(path);

    const particles = Array.from({ length: CONFIG.particleCount }, () => {
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("fill", "currentColor");
      group.appendChild(circle);
      return circle;
    });

    svg.appendChild(group);

    const startedAt = performance.now();
    let raf: number;

    function render(now: number) {
      const time = now - startedAt;
      const progress = (time % CONFIG.durationMs) / CONFIG.durationMs;
      const detailScale = getDetailScale(time);

      path.setAttribute("d", buildPath(detailScale));

      particles.forEach((node, i) => {
        const tailOffset = i / (CONFIG.particleCount - 1);
        const pt = lemniscatePoint(
          normalizeProgress(progress - tailOffset * CONFIG.trailSpan),
          detailScale,
        );
        const fade = Math.pow(1 - tailOffset, 0.56);
        node.setAttribute("cx", pt.x.toFixed(2));
        node.setAttribute("cy", pt.y.toFixed(2));
        node.setAttribute("r", (0.9 + fade * 2.7).toFixed(2));
        node.setAttribute("opacity", (0.04 + fade * 0.96).toFixed(3));
      });

      raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (svg.contains(group)) svg.removeChild(group);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    />
  );
}
