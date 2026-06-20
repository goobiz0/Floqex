import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-zinc-50 dark:bg-black">
      <SignUp />
    </div>
  );
}
