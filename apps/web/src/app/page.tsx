import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-center text-5xl font-extrabold tracking-tight sm:text-6xl">
          SME Financial{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            OS
          </span>
        </h1>
        <p className="max-w-xl text-center text-lg text-muted-foreground">
          All-in-one financial platform for Czech and Polish SMEs. Invoicing, banking, expenses,
          and cash flow insights in one place.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-border bg-background px-6 py-3 font-semibold transition-colors hover:bg-accent"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
