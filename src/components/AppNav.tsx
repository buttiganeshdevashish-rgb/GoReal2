"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import { logoutAction } from "@/lib/actions";

const LINKS = [
  { href: "/home", label: "Feed", icon: "🏠" },
  { href: "/communities", label: "Communities", icon: "👥" },
  { href: "/coach", label: "AI Coach", icon: "✨" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/notifications", label: "Alerts", icon: "🔔" },
];

export default function AppNav({
  name,
  username,
  hue,
  unread,
  streak,
}: {
  name: string;
  username: string;
  hue: number;
  unread: number;
  streak: number;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/[0.06] bg-ink-900/60 p-4 backdrop-blur-xl lg:flex">
        <Link href="/home" className="flex items-center gap-2.5 px-2 py-3">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-bold text-white">GoalReal</span>
        </Link>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-brand-500/15 text-white" : "text-ink-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span>{l.icon}</span> {l.label}
                {l.href === "/notifications" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">{unread}</span>
                )}
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-brand-500" />}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2">
          <div className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-flame-400">{streak}-day</span>
            <span className="text-ink-400">streak</span>
          </div>
          <Link href={`/profile/${username}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.05]">
            <Avatar name={name} hue={hue} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="truncate text-xs text-ink-400">@{username}</p>
            </div>
          </Link>
          <form action={logoutAction}>
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink-400 hover:bg-white/[0.05] hover:text-white">
              ← Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-ink-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="font-display text-lg font-bold text-white">GoalReal</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="chip border-flame-500/30 bg-flame-500/10 text-flame-400">🔥 {streak}</span>
          <Link href={`/profile/${username}`}>
            <Avatar name={name} hue={hue} size={32} />
          </Link>
          <form action={logoutAction} className="inline-flex">
            <button className="rounded-lg bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-ink-300 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white active:scale-95 transition-all">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/[0.06] bg-ink-950/90 py-2 backdrop-blur-xl lg:hidden">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] ${active ? "text-brand-300" : "text-ink-400"}`}
            >
              <span className="text-lg">{l.icon}</span>
              {l.label}
              {l.href === "/notifications" && unread > 0 && (
                <span className="absolute -top-0.5 right-1 h-2 w-2 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
