import type { ReactNode } from "react";
import { Reveal } from "@/components/marketing/reveal";

/** Shared shell for legal/policy pages: centered editorial column, dark-locked. */
export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div aria-hidden className="aurora pointer-events-none absolute inset-x-0 top-0 h-[40vh] opacity-40" />
      <article className="relative mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:py-28">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-fg-subtle">Last updated {updated}</p>
        <p className="mt-6 text-pretty text-lg leading-relaxed text-fg-muted">{intro}</p>
        <div className="mt-12 space-y-10">{children}</div>
      </article>
    </div>
  );
}

/** A titled section inside a legal page. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Reveal as="section">
      <h2 className="text-lg font-semibold tracking-tight text-fg">{heading}</h2>
      <div className="mt-3 space-y-4 text-[0.95rem] leading-relaxed text-fg-muted [&_a]:text-accent [&_a:hover]:text-accent-hover">
        {children}
      </div>
    </Reveal>
  );
}
