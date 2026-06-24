import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export default function SecurityPage() {
  return (
    <div className="min-h-[100dvh] bg-base py-24 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold tracking-wider text-accent">
            <ShieldCheck size={14} weight="bold" /> Security First
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Security Architecture</h1>
          <p className="text-lg text-fg-muted leading-relaxed">
            How we protect your API keys, execution data, and financial privacy.
          </p>
        </div>
        <div className="prose prose-invert max-w-none text-fg-subtle space-y-4">
          <p>
            Your broker API keys are encrypted at rest using AES-256-GCM. 
            They are never exposed to the client interface and are only decrypted in memory at the exact moment of order execution.
          </p>
          <p>
            This page is currently being updated with our latest compliance reports and security audits.
          </p>
        </div>
      </div>
    </div>
  );
}
