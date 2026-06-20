export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Welcome to Floqex
        </h1>
        <p className="max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Clerk authentication is wired up. Use the sign-in and sign-up buttons
          in the header to create your first account.
        </p>
      </main>
    </div>
  );
}
