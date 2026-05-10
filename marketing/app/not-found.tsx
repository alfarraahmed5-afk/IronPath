import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80svh] grid place-items-center px-4">
      <div className="text-center">
        <p className="font-mono text-xs text-ink-400 mb-3">404</p>
        <h1 className="font-display text-3xl mb-3">Page not found.</h1>
        <p className="text-ink-300 mb-6 max-w-sm">
          That URL doesn't exist. Try the home page.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-450 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
