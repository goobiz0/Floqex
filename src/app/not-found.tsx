import { Button } from "@/components/ui/button";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-base p-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-line text-fg-subtle">
        <MagnifyingGlass size={32} weight="duotone" />
      </div>
      <h1 className="mb-2 text-2xl font-medium tracking-tight text-fg">
        Page not found
      </h1>
      <p className="mb-8 max-w-sm text-sm text-fg-muted">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Button href="/" variant="primary">
        Return Home
      </Button>
    </div>
  );
}
