import Link from "next/link";
import { ArrowLeft, BookOpen } from "@phosphor-icons/react/dist/ssr";

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-base py-24 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1 text-xs font-semibold tracking-wider text-fg-muted">
            <BookOpen size={14} weight="bold" /> Legal
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Terms & Conditions</h1>
          <p className="text-lg text-fg-muted leading-relaxed">
            Please read these terms carefully before using the Floqex platform.
          </p>
        </div>
        <div className="prose prose-invert max-w-none text-fg-subtle space-y-4">
          <p>
            By accessing or using the platform, you agree to be bound by these terms. 
            Floqex provides execution software and does not provide financial advice.
          </p>
          <p>
            This page is currently being drafted by our legal team.
          </p>
        </div>
      </div>
    </div>
  );
}
