import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { authUrl } from "@/lib/urls";

/**
 * Closing CTA. Centered editorial moment, single primary action. Reuses the
 * "Start free" label (one label per signup intent across the whole page).
 */
export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-elevated py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(50%_70%_at_50%_0%,var(--color-accent-soft),transparent_65%)]"
      />
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg md:text-5xl">
          Put your strategy on autopilot.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-fg-muted">
          Open a free paper account, build your first bot in minutes, and watch
          it work before you ever risk a cent.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            href={authUrl("/sign-up")}
            size="lg"
            className="h-12 w-full px-7 text-[0.95rem] font-semibold sm:w-auto"
          >
            Start free
            <ArrowRight size={18} weight="bold" />
          </Button>
          <Button
            href="/how-it-works"
            variant="secondary"
            size="lg"
            className="h-12 w-full px-7 text-[0.95rem] font-medium sm:w-auto"
          >
            See how it works
          </Button>
        </div>
      </div>
    </section>
  );
}
