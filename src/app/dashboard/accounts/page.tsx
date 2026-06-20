import type { Metadata } from "next";
import { UserButton } from "@clerk/nextjs";
import { Card, CardTitle } from "@/components/ui/card";
import { AccountsView } from "@/components/dashboard/accounts-view";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Accounts</h1>
        <p className="text-sm text-fg-subtle">
          Connect broker accounts. Each one runs its own isolated bot.
        </p>
      </div>

      <AccountsView />

      <Card className="p-5">
        <CardTitle>Profile</CardTitle>
        <div className="mt-4 flex items-center gap-3">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "h-10 w-10" } }} />
          <div>
            <p className="text-sm font-medium text-fg">Your Clerk profile</p>
            <p className="text-xs text-fg-subtle">
              Manage your name, email, and security from the avatar menu.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
