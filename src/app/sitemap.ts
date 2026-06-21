import type { MetadataRoute } from "next";

const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
const base = new URL(root?.startsWith("http") ? root : `https://${root || "floqex.com"}`).origin;

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: "weekly" | "monthly" }[] = [
    { path: "", priority: 1, freq: "weekly" },
    { path: "/pricing", priority: 0.8, freq: "monthly" },
    { path: "/how-it-works", priority: 0.7, freq: "monthly" },
    { path: "/security", priority: 0.6, freq: "monthly" },
    { path: "/terms", priority: 0.3, freq: "monthly" },
    { path: "/privacy", priority: 0.3, freq: "monthly" },
    { path: "/risk-disclosure", priority: 0.3, freq: "monthly" },
  ];
  return routes.map((r) => ({
    url: `${base}${r.path}`,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
