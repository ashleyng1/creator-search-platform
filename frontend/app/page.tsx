import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <header className="border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-brand-600">CreatorFind</span>
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary">Sign in</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-gray-900 md:text-5xl">
          Find creators. Collaborate. Measure impact.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-gray-500">
          Search 1,000+ Instagram creators with natural language. Shortlist as a team, get approvals, and track campaign performance.
        </p>
        <Link href="/login" className="btn-primary mt-8 px-8 py-3 text-base">
          Try the demo
        </Link>
        <p className="mt-3 text-xs text-gray-400">demo@brand.com / demo1234</p>
      </main>
    </div>
  );
}
