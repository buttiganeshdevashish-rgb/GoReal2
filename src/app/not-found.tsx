import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl">🫥</p>
      <h1 className="font-display text-2xl font-bold text-white">This page skipped its streak.</h1>
      <p className="text-ink-400">The page you're looking for doesn't exist.</p>
      <Link href="/home" className="btn-primary">Back to feed</Link>
    </div>
  );
}
