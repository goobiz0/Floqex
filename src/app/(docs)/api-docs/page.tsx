import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Code, BookOpen, Key, TerminalWindow } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "API Documentation | Floqex" };

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-12 space-y-16">
      <div className="text-center space-y-4 pt-12">
        <h1 className="text-4xl font-bold tracking-tight text-fg">Floqex API</h1>
        <p className="text-xl text-fg-subtle max-w-2xl mx-auto">
          Integrate our trading engine directly into your own applications. Full programmatic access coming soon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8 space-y-4 border border-line">
          <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center text-accent">
            <Key size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">Authentication</h3>
          <p className="text-fg-subtle leading-relaxed">
            Secure REST API access via Bearer tokens. Issue and revoke API keys directly from your developer dashboard.
          </p>
        </Card>

        <Card className="p-8 space-y-4 border border-line">
          <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <TerminalWindow size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">Webhooks</h3>
          <p className="text-fg-subtle leading-relaxed">
            Receive real-time push notifications for trade executions, daily PnL summaries, and risk limit breaches.
          </p>
        </Card>

        <Card className="p-8 space-y-4 border border-line">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Code size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">SDKs</h3>
          <p className="text-fg-subtle leading-relaxed">
            Official SDKs for Node.js, Python, and Go will be available soon. Interact with your bots natively.
          </p>
        </Card>

        <Card className="p-8 space-y-4 border border-line">
          <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
            <BookOpen size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-fg">Comprehensive Docs</h3>
          <p className="text-fg-subtle leading-relaxed">
            Detailed API references, OpenAPI specs, and copy-paste examples for every endpoint.
          </p>
        </Card>
      </div>

      <div className="rounded-3xl bg-surface p-8 border border-line text-center space-y-4">
        <h3 className="text-2xl font-bold text-fg">Join the Developer Waitlist</h3>
        <p className="text-fg-subtle">Get early access to our developer tools before public launch.</p>
        <div className="pt-4 flex justify-center">
          <Button variant="primary" disabled size="lg">Waitlist Closed</Button>
        </div>
      </div>

      <div className="text-center pt-8">
        <Button variant="secondary" href="/dashboard" size="lg">Return to Dashboard</Button>
      </div>
    </div>
  );
}
