import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-zinc-50 dark:bg-black">
      <SignIn />
    </div>
  );
}
