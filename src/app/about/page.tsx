import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function AboutPage() {
  return (
    <div className="min-h-[100dvh] bg-base py-24 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-fg">About Service</h1>
          <p className="text-lg text-fg-muted leading-relaxed">
            Floqex is an institutional-grade algorithmic execution platform designed to eliminate emotional trading.
          </p>
        </div>
        <div className="prose prose-invert max-w-none text-fg-subtle">
          <p>
            We connect directly to your broker and execute Opening Range Breakout strategies with machine precision.
            This page is currently under construction. Please check back later for detailed information about our company, mission, and team.
          </p>
        </div>
      </div>
    </div>
  );
}
