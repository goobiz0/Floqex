import type { Metadata } from "next";
import { Question, ChatCircle, BookOpen, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Help Center | Floqex" };

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-12 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-fg">How can we help?</h1>
        <p className="text-lg text-fg-subtle max-w-xl mx-auto">
          Search our knowledge base or get in touch with our support team.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <input 
          type="text" 
          placeholder="Search for articles, guides, or troubleshooting..." 
          className="w-full h-14 pl-5 pr-12 rounded-full border border-line bg-surface text-fg focus:outline-none focus:border-accent transition-colors"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-subtle">
          <Question size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:border-accent transition-colors cursor-pointer">
          <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center text-accent">
            <BookOpen size={24} weight="fill" />
          </div>
          <div>
            <h3 className="font-semibold text-fg">Knowledge Base</h3>
            <p className="text-sm text-fg-subtle mt-1">Read our guides on how to set up and optimize your trading bots.</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:border-accent transition-colors cursor-pointer">
          <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <ChatCircle size={24} weight="fill" />
          </div>
          <div>
            <h3 className="font-semibold text-fg">Community Discord</h3>
            <p className="text-sm text-fg-subtle mt-1">Join our community of traders to share strategies and get help.</p>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:border-accent transition-colors cursor-pointer">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <EnvelopeSimple size={24} weight="fill" />
          </div>
          <div>
            <h3 className="font-semibold text-fg">Contact Support</h3>
            <p className="text-sm text-fg-subtle mt-1">Need direct assistance? Open a ticket with our support team.</p>
          </div>
        </Card>
      </div>

      <div className="pt-12 text-center">
        <Button variant="secondary" href="/dashboard">Back to Dashboard</Button>
      </div>
    </div>
  );
}
