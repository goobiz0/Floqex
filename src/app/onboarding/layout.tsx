import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);

      // If the user has already onboarded, redirect them to the dashboard
      if (user.privateMetadata?.onboardedAt) {
        redirect("/dashboard");
      }
    } catch (e) {
      // Ignore errors fetching user
    }
  }

  return <>{children}</>;
}
